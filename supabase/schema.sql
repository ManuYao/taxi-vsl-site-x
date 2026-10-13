-- Base de données du site taxi (Supabase / Postgres).
--
-- COMMENT L'UTILISER : Supabase > SQL Editor > New query > coller tout ce fichier > Run.
-- On peut le relancer sans danger : rien n'est effacé ni dupliqué.
--
-- SÉCURITÉ (à retenir) :
--  - Personne ne peut LIRE les réservations depuis le site : aucune règle n'est donnée au public.
--  - Le site enregistre une réservation avec la clé secrète (côté serveur seulement), qui passe outre ces règles.
--  - L'espace chauffeur lit et met à jour les courses, mais SEULEMENT pour les personnes de la table « staff ».
--    (Dans Supabase, n'importe qui pourrait demander un lien de connexion : sans cette table, il verrait les courses.)

-- =====================================================================================================
-- 1. L'équipe : qui a le droit d'entrer dans l'espace chauffeur
-- =====================================================================================================
create table if not exists public.staff (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         text not null default 'chauffeur' check (role in ('patron', 'chauffeur')),
  display_name text check (char_length(display_name) <= 100),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- « Cette personne connectée fait-elle partie de l'équipe ? » (utilisé par les règles ci-dessous)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid()) and s.active
  );
$$;

create or replace function public.is_patron()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid()) and s.active and s.role = 'patron'
  );
$$;

-- Ces fonctions ne servent qu'aux personnes connectées (pas au public)
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_patron() from public, anon;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_patron() to authenticated, service_role;

-- =====================================================================================================
-- 2. Les réservations
-- =====================================================================================================
create table if not exists public.bookings (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  -- Évite un doublon si le client appuie deux fois sur « Envoyer » (le navigateur génère un identifiant par demande)
  client_request_id uuid unique,
  status            text not null default 'pending'
                      check (status in ('pending', 'accepted', 'refused', 'done', 'cancelled')),

  -- Trajet. Les coordonnées sont vides si le client a écrit son adresse à la main.
  from_label        text not null check (char_length(from_label) between 1 and 300),
  from_lat          double precision,
  from_lng          double precision,
  stop_label        text check (char_length(stop_label) <= 300),
  stop_lat          double precision,
  stop_lng          double precision,
  to_label          text not null check (char_length(to_label) between 1 and 300),
  to_lat            double precision,
  to_lng            double precision,

  -- Prise en charge (instant exact ; l'heure saisie est celle de Paris)
  pickup_at         timestamptz not null,
  passengers        smallint not null default 1 check (passengers between 1 and 8),
  luggage           boolean not null default false,
  conventionne      boolean not null default false,   -- simple case cochée : aucune donnée de santé
  travel_ref        text check (char_length(travel_ref) <= 60),   -- numéro de vol ou de train

  -- Estimation calculée par le serveur (vide si adresse écrite à la main)
  est_km            numeric(7, 1),
  est_minutes       integer,
  est_price_cents   integer,
  tarif             text check (tarif in ('jour', 'nuit')),
  est_approximatif  boolean,

  -- Client
  customer_name     text not null check (char_length(customer_name) between 1 and 100),
  customer_phone    text not null check (char_length(customer_phone) between 6 and 30),
  customer_email    text check (char_length(customer_email) <= 200),
  note              text check (char_length(note) <= 1000),

  -- Suite donnée (espace chauffeur)
  accepted_by       uuid references auth.users (id) on delete set null,
  decided_at        timestamptz,

  -- Trace des alertes envoyées au chauffeur, par exemple {"telegram": true, "email": false}
  alerts            jsonb not null default '{}'::jsonb
);

create index if not exists bookings_status_pickup_idx on public.bookings (status, pickup_at);
create index if not exists bookings_created_idx on public.bookings (created_at desc);

-- =====================================================================================================
-- 3. Les téléphones qui reçoivent les notifications (espace chauffeur, plus tard)
-- =====================================================================================================
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  device_label text check (char_length(device_label) <= 100)
);

-- =====================================================================================================
-- 4. Réglages (une seule ligne)
-- =====================================================================================================
create table if not exists public.settings (
  id          integer primary key default 1 check (id = 1),
  disponible  boolean not null default true,
  tarifs      jsonb,   -- vide : on utilise les tarifs de site.config.js
  horaires    jsonb,
  updated_at  timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- =====================================================================================================
-- 5. Règles d'accès (Row Level Security) : tout est fermé, on n'ouvre que ce qui est nécessaire
-- =====================================================================================================
alter table public.staff              enable row level security;
alter table public.bookings           enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.settings           enable row level security;

-- Privilèges explicites (le public n'a rien ; les connectés ont le minimum, filtré ensuite par les règles)
revoke all on public.staff, public.bookings, public.push_subscriptions, public.settings from anon, authenticated;
grant all on public.staff, public.bookings, public.push_subscriptions, public.settings to service_role;
grant select, insert, update, delete on public.staff to authenticated;
grant select, update on public.bookings to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, update on public.settings to authenticated;

-- staff : chacun voit sa propre fiche, le patron voit et gère toute l'équipe
drop policy if exists "staff_select" on public.staff;
create policy "staff_select" on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or public.is_patron());

drop policy if exists "staff_patron_ecrit" on public.staff;
create policy "staff_patron_ecrit" on public.staff for all to authenticated
  using (public.is_patron()) with check (public.is_patron());

-- bookings : l'équipe lit et met à jour. Pas d'insertion ni de suppression depuis l'espace chauffeur.
drop policy if exists "bookings_staff_select" on public.bookings;
create policy "bookings_staff_select" on public.bookings for select to authenticated
  using (public.is_staff());

drop policy if exists "bookings_staff_update" on public.bookings;
create policy "bookings_staff_update" on public.bookings for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- push_subscriptions : chacun gère ses propres appareils
drop policy if exists "push_own" on public.push_subscriptions;
create policy "push_own" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()) and public.is_staff())
  with check (user_id = (select auth.uid()) and public.is_staff());

-- settings : l'équipe lit, le patron modifie
drop policy if exists "settings_staff_select" on public.settings;
create policy "settings_staff_select" on public.settings for select to authenticated
  using (public.is_staff());

drop policy if exists "settings_patron_update" on public.settings;
create policy "settings_patron_update" on public.settings for update to authenticated
  using (public.is_patron()) with check (public.is_patron());

-- =====================================================================================================
-- 6. Mise à jour en direct de la liste des courses dans l'espace chauffeur
-- =====================================================================================================
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null;   -- déjà fait
  when undefined_object then null;   -- pas de publication « realtime » : on s'en occupera plus tard
end
$$;

-- =====================================================================================================
-- À FAIRE PLUS TARD (espace chauffeur) : déclarer le patron.
-- Après avoir créé son compte (Authentication > Users > Add user), remplacer l'adresse puis lancer :
--
--   insert into public.staff (user_id, role, display_name)
--   select id, 'patron', 'Patron' from auth.users where email = 'adresse-du-patron@exemple.fr';
-- =====================================================================================================

-- Résultat attendu : les 4 tables ci-dessous
select table_name as tables_creees
from information_schema.tables
where table_schema = 'public' and table_name in ('staff', 'bookings', 'push_subscriptions', 'settings')
order by table_name;
