-- Approved accounts are managed only by the project administrator.
create table public.pilot_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 approved_at timestamptz not null default now()
);
alter table public.pilot_members enable row level security;
alter table public.pilot_members force row level security;
revoke all on public.pilot_members from public, anon, authenticated;
grant select on public.pilot_members to authenticated;
create policy pilot_self on public.pilot_members for select to authenticated using ((select auth.uid()) = user_id);
-- One private document per account for the first cloud milestone.
-- No service-role key is used by the application. All queries run as the player.
create table public.player_workspaces (
 owner_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
 revision integer not null default 1 check (revision > 0),
 payload jsonb not null check ((jsonb_typeof(payload) = 'object' and payload ?& array['version','campaigns'] and payload->>'version' = '1' and jsonb_typeof(payload->'campaigns') = 'array' and octet_length(payload::text) <= 8388608) is true),
 updated_at timestamptz not null default now()
);
alter table public.player_workspaces enable row level security;
alter table public.player_workspaces force row level security;
revoke all on public.player_workspaces from public, anon, authenticated;
grant select, insert, update on public.player_workspaces to authenticated;
create policy workspace_read on public.player_workspaces for select to authenticated using ((select auth.uid()) = owner_id and exists (select 1 from public.pilot_members where user_id = (select auth.uid())));
create policy workspace_create on public.player_workspaces for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.pilot_members where user_id = (select auth.uid())) and revision = 1);
create policy workspace_save on public.player_workspaces for update to authenticated using ((select auth.uid()) = owner_id and exists (select 1 from public.pilot_members where user_id = (select auth.uid()))) with check ((select auth.uid()) = owner_id and exists (select 1 from public.pilot_members where user_id = (select auth.uid())));
-- No DELETE grant: campaign/account deletion is a later, explicit workflow.
create function public.check_workspace_revision() returns trigger language plpgsql set search_path = '' as $$
begin
 if new.owner_id <> old.owner_id then raise exception 'Workspace owner cannot change'; end if;
 if new.revision <> old.revision + 1 then raise exception 'Workspace revision must increase by one'; end if;
 new.updated_at = now();
 return new;
end;
$$;
revoke all on function public.check_workspace_revision() from public;
create trigger check_workspace_revision before update on public.player_workspaces for each row execute function public.check_workspace_revision();
