-- Bloc F : disponibilité, promotions, paiements (+ quelques colonnes en plus sur les réservations).
--
-- COMMENT L'UTILISER : Supabase > SQL Editor > New query > coller tout ce fichier > Run.
-- À lancer APRÈS supabase/schema.sql. On peut le relancer sans danger : rien n'est effacé ni dupliqué.
--
-- Même principe de sécurité que schema.sql : le public ne lit rien ; le site passe par le serveur ;
-- l'équipe (table « staff ») lit et modifie ce que les règles ci-dessous autorisent.

-- =====================================================================================================
-- 1. Disponibilité (une seule ligne) : en ligne / hors ligne / vacances, avec dates et message
-- =====================================================================================================
create table if not exists public.availability (
  id         integer primary key default 1 check (id = 1),
  state      text not null default 'online' check (state in ('online', 'offline', 'vacances')),
  date_from  date,   -- « vacances » : premier jour (vide = tout de suite)
  date_to    date,   -- « vacances » : dernier jour inclus (vide = jusqu'à nouvel ordre)
  message    text check (char_length(message) <= 300),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.availability (id) values (1) on conflict (id) do nothing;

-- =====================================================================================================
-- 2. Promotions
-- =====================================================================================================
create table if not exists public.promotions (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(name) between 1 and 100),
  percent    smallint not null check (percent between 1 and 90),
  -- all : toutes les courses ; gares_aeroports : trajet vers une gare ou un aéroport ; longue_distance : à partir de 50 km
  scope      text not null default 'all' check (scope in ('all', 'gares_aeroports', 'longue_distance')),
  code       text check (char_length(code) between 2 and 30),   -- vide : la remise s'applique sans code
  starts_on  date,
  ends_on    date,
  active     boolean not null default true
);
create unique index if not exists promotions_code_unique on public.promotions (lower(code)) where code is not null;

-- =====================================================================================================
-- 3. Paiements (encaissement des courses)
-- =====================================================================================================
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  mode         text not null check (mode in ('especes', 'carte', 'tiers_payant', 'virement')),
  amount_cents integer not null check (amount_cents >= 0),
  status       text not null default 'paid' check (status in ('paid', 'pending')),   -- pending : tiers payant à recevoir
  paid_at      timestamptz,
  created_by   uuid references auth.users (id) on delete set null
);
create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists payments_paid_at_idx on public.payments (paid_at desc);

-- =====================================================================================================
-- 4. Réservations : la promotion appliquée au moment de la demande
-- =====================================================================================================
alter table public.bookings add column if not exists promo_name text check (char_length(promo_name) <= 100);
alter table public.bookings add column if not exists promo_percent smallint check (promo_percent between 1 and 90);
alter table public.bookings add column if not exists est_price_before_cents integer;   -- prix avant remise

-- =====================================================================================================
-- 5. Règles d'accès
-- =====================================================================================================
alter table public.availability enable row level security;
alter table public.promotions   enable row level security;
alter table public.payments     enable row level security;

revoke all on public.availability, public.promotions, public.payments from anon, authenticated;
grant all on public.availability, public.promotions, public.payments to service_role;
grant select, update on public.availability to authenticated;
grant select, insert, update, delete on public.promotions to authenticated;
grant select, insert, update, delete on public.payments to authenticated;

-- availability : toute l'équipe lit et change l'état (le chauffeur met « hors ligne » depuis son téléphone)
drop policy if exists "availability_staff_select" on public.availability;
create policy "availability_staff_select" on public.availability for select to authenticated
  using (public.is_staff());
drop policy if exists "availability_staff_update" on public.availability;
create policy "availability_staff_update" on public.availability for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- promotions : l'équipe lit, seul le patron crée / modifie / supprime
drop policy if exists "promotions_staff_select" on public.promotions;
create policy "promotions_staff_select" on public.promotions for select to authenticated
  using (public.is_staff());
drop policy if exists "promotions_patron_ecrit" on public.promotions;
create policy "promotions_patron_ecrit" on public.promotions for all to authenticated
  using (public.is_patron()) with check (public.is_patron());

-- payments : l'équipe lit et enregistre les paiements ; seul le patron peut en supprimer
drop policy if exists "payments_staff_select" on public.payments;
create policy "payments_staff_select" on public.payments for select to authenticated
  using (public.is_staff());
drop policy if exists "payments_staff_insert" on public.payments;
create policy "payments_staff_insert" on public.payments for insert to authenticated
  with check (public.is_staff());
drop policy if exists "payments_staff_update" on public.payments;
create policy "payments_staff_update" on public.payments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "payments_patron_delete" on public.payments;
create policy "payments_patron_delete" on public.payments for delete to authenticated
  using (public.is_patron());

-- Résultat attendu : les 3 tables ci-dessous
select table_name as tables_creees
from information_schema.tables
where table_schema = 'public' and table_name in ('availability', 'promotions', 'payments')
order by table_name;
