-- =============================================================================
-- Repoint user foreign keys from auth.users(id) to user_profiles(id)
-- =============================================================================
-- The production auth schema died with the Supabase project and only the public
-- schema was ever backed up, so the auth.users rows these constraints reference
-- no longer exist. user_profiles carries the SAME uuids — migration
-- 20260325600000 created it with id = auth.users.id and backfilled every row —
-- so this changes the constraint target and touches no data.
--
-- ON DELETE behaviour is preserved exactly as each constraint had it, verified
-- against the live schema's pg_constraint.confdeltype (not assumed):
--   orders_user_id_fkey                       confdeltype=c (CASCADE)
--   orders_seller_id_fkey                     confdeltype=a (NO ACTION) -- NOTE:
--     the original migration plan assumed CASCADE here; the live schema has
--     NO ACTION (default), so this migration preserves NO ACTION instead.
--   products_seller_id_fkey                   confdeltype=n (SET NULL)
--   product_reviews_user_id_fkey              confdeltype=c (CASCADE)
--   seller_payment_methods_seller_id_fkey      confdeltype=c (CASCADE)
--   user_permissions_user_id_fkey             confdeltype=c (CASCADE)
--   user_permissions_granted_by_fkey          confdeltype=a (NO ACTION)
--   check_ins_checked_in_by_fkey              confdeltype=a (NO ACTION)
--   check_in_audit_performed_by_fkey          confdeltype=a (NO ACTION)
--   ticket_transfers_from_user_id_fkey        confdeltype=a (NO ACTION)
--   ticket_transfers_to_user_id_fkey          confdeltype=a (NO ACTION)
--
-- seller_admins is deliberately absent: it already references user_profiles.
-- =============================================================================

-- orders
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders add constraint orders_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;

alter table public.orders drop constraint if exists orders_seller_id_fkey;
alter table public.orders add constraint orders_seller_id_fkey
  foreign key (seller_id) references public.user_profiles(id);

-- products
alter table public.products drop constraint if exists products_seller_id_fkey;
alter table public.products add constraint products_seller_id_fkey
  foreign key (seller_id) references public.user_profiles(id) on delete set null;

-- product_reviews
alter table public.product_reviews drop constraint if exists product_reviews_user_id_fkey;
alter table public.product_reviews add constraint product_reviews_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;

-- seller_payment_methods
alter table public.seller_payment_methods drop constraint if exists seller_payment_methods_seller_id_fkey;
alter table public.seller_payment_methods add constraint seller_payment_methods_seller_id_fkey
  foreign key (seller_id) references public.user_profiles(id) on delete cascade;

-- user_permissions
alter table public.user_permissions drop constraint if exists user_permissions_user_id_fkey;
alter table public.user_permissions add constraint user_permissions_user_id_fkey
  foreign key (user_id) references public.user_profiles(id) on delete cascade;

alter table public.user_permissions drop constraint if exists user_permissions_granted_by_fkey;
alter table public.user_permissions add constraint user_permissions_granted_by_fkey
  foreign key (granted_by) references public.user_profiles(id);

-- check_ins / check_in_audit
alter table public.check_ins drop constraint if exists check_ins_checked_in_by_fkey;
alter table public.check_ins add constraint check_ins_checked_in_by_fkey
  foreign key (checked_in_by) references public.user_profiles(id);

alter table public.check_in_audit drop constraint if exists check_in_audit_performed_by_fkey;
alter table public.check_in_audit add constraint check_in_audit_performed_by_fkey
  foreign key (performed_by) references public.user_profiles(id);

-- ticket_transfers
alter table public.ticket_transfers drop constraint if exists ticket_transfers_from_user_id_fkey;
alter table public.ticket_transfers add constraint ticket_transfers_from_user_id_fkey
  foreign key (from_user_id) references public.user_profiles(id);

alter table public.ticket_transfers drop constraint if exists ticket_transfers_to_user_id_fkey;
alter table public.ticket_transfers add constraint ticket_transfers_to_user_id_fkey
  foreign key (to_user_id) references public.user_profiles(id);
