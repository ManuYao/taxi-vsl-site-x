-- Niveaux d'accès de l'équipe : 0 = chauffeur, 1 = manager, 2 = patron.
--
-- COMMENT L'UTILISER : Supabase > SQL Editor > New query > coller tout ce fichier > Run.
-- On peut le relancer sans danger. Le site actuel continue de fonctionner pendant et après ce script.
-- La colonne « role » reste en place (elle ne sert plus) : on la supprimera plus tard, une fois le nouveau code en ligne.

alter table public.staff add column if not exists niveau smallint not null default 0;

alter table public.staff drop constraint if exists staff_niveau_check;
alter table public.staff add constraint staff_niveau_check check (niveau between 0 and 2);

-- Les patrons actuels passent au niveau 2 (les autres restent au niveau 0)
update public.staff set niveau = 2 where role = 'patron' and niveau < 2;

-- Les règles de sécurité existantes (« is_patron ») suivent désormais le niveau
create or replace function public.is_patron()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid()) and s.active and s.niveau = 2
  );
$$;

revoke execute on function public.is_patron() from public, anon;
grant execute on function public.is_patron() to authenticated, service_role;
