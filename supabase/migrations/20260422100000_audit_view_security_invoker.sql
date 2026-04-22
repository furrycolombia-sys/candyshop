-- Fix: public.logged_actions_with_user was implicitly SECURITY DEFINER because
-- it proxies a view in the audit schema. Switch to SECURITY INVOKER so Postgres
-- enforces the querying user's own permissions instead of the view owner's.
-- Grant USAGE on audit schema so authenticated users can resolve the underlying view.

grant usage on schema audit to authenticated;

create or replace view public.logged_actions_with_user
  with (security_invoker = true)
as
select * from audit.logged_actions_with_user;

grant select on public.logged_actions_with_user to authenticated;
