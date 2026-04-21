-- PostgREST on Supabase Cloud only exposes the public schema by default.
-- audit.logged_actions_with_user lives in the audit schema, so REST calls
-- to /rest/v1/logged_actions_with_user return 406.
-- This view proxies it through public so no dashboard config change is needed.

create or replace view public.logged_actions_with_user as
select * from audit.logged_actions_with_user;

grant select on public.logged_actions_with_user to authenticated;
