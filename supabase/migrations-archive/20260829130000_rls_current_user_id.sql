-- =============================================================================
-- Move every RLS policy from auth.uid() to current_user_id()
-- =============================================================================
-- Generated from the applied schema, so each predicate is preserved exactly and
-- only the caller-identity expression changes. Under Third-Party Auth,
-- auth.uid() casts a Clerk sub to uuid and fails; current_user_id() resolves the
-- caller through user_profiles.identity_sub instead.
--
-- has_permission(uuid, text) is unchanged — it takes a local user id, which is
-- exactly what current_user_id() returns.
-- =============================================================================

drop policy if exists check_ins_insert on public.check_ins;
create policy check_ins_insert on public.check_ins for INSERT to public
  with check (has_permission(public.current_user_id(), 'check_ins.create'::text));
drop policy if exists check_ins_read on public.check_ins;
create policy check_ins_read on public.check_ins for SELECT to public
  using ((has_permission(public.current_user_id(), 'check_ins.read'::text) AND (order_item_id IN ( SELECT oi.id
   FROM (order_items oi
     JOIN orders o ON ((o.id = oi.order_id)))
  WHERE ((o.user_id = public.current_user_id()) OR (o.seller_id = public.current_user_id()))))));
drop policy if exists check_ins_update on public.check_ins;
create policy check_ins_update on public.check_ins for UPDATE to public
  using (has_permission(public.current_user_id(), 'check_ins.update'::text));
drop policy if exists events_delete on public.events;
create policy events_delete on public.events for DELETE to public
  using (has_permission(public.current_user_id(), 'events.delete'::text));
drop policy if exists events_insert on public.events;
create policy events_insert on public.events for INSERT to public
  with check (has_permission(public.current_user_id(), 'events.create'::text));
drop policy if exists events_update on public.events;
create policy events_update on public.events for UPDATE to public
  using (has_permission(public.current_user_id(), 'events.update'::text));
drop policy if exists order_items_buyer_insert on public.order_items;
create policy order_items_buyer_insert on public.order_items for INSERT to public
  with check ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = public.current_user_id())))));
drop policy if exists order_items_delegate_read on public.order_items;
create policy order_items_delegate_read on public.order_items for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM (orders o
     JOIN seller_admins sa ON (((sa.seller_id = o.seller_id) AND (sa.admin_user_id = public.current_user_id()) AND (sa.product_id = order_items.product_id))))
  WHERE (o.id = order_items.order_id))));
drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND ((o.user_id = public.current_user_id()) OR (o.seller_id = public.current_user_id()))))));
drop policy if exists orders_buyer_insert on public.orders;
create policy orders_buyer_insert on public.orders for INSERT to public
  with check ((has_permission(public.current_user_id(), 'orders.create'::text) AND (user_id = public.current_user_id())));
drop policy if exists orders_buyer_update on public.orders;
create policy orders_buyer_update on public.orders for UPDATE to public
  using ((has_permission(public.current_user_id(), 'orders.create'::text) AND (user_id = public.current_user_id())));
drop policy if exists orders_delegate_read on public.orders;
create policy orders_delegate_read on public.orders for SELECT to public
  using ((EXISTS ( SELECT 1
   FROM seller_admins sa
  WHERE ((sa.admin_user_id = public.current_user_id()) AND (sa.seller_id = orders.seller_id)))));
drop policy if exists orders_delegate_update on public.orders;
create policy orders_delegate_update on public.orders for UPDATE to public
  using (((payment_status = ANY (ARRAY['pending_verification'::payment_status, 'evidence_requested'::payment_status])) AND (EXISTS ( SELECT 1
   FROM seller_admins sa
  WHERE ((sa.admin_user_id = public.current_user_id()) AND (sa.seller_id = orders.seller_id) AND (('orders.approve'::text = ANY (sa.permissions)) OR ('orders.request_proof'::text = ANY (sa.permissions))))))));
drop policy if exists orders_read on public.orders;
create policy orders_read on public.orders for SELECT to public
  using ((has_permission(public.current_user_id(), 'orders.read'::text) AND ((user_id = public.current_user_id()) OR (seller_id = public.current_user_id()))));
drop policy if exists orders_seller_update on public.orders;
create policy orders_seller_update on public.orders for UPDATE to public
  using ((has_permission(public.current_user_id(), 'orders.update'::text) AND (seller_id = public.current_user_id())));
drop policy if exists settings_insert on public.payment_settings;
create policy settings_insert on public.payment_settings for INSERT to public
  with check (has_permission(public.current_user_id(), 'payment_settings.update'::text));
drop policy if exists settings_read on public.payment_settings;
create policy settings_read on public.payment_settings for SELECT to public
  using (has_permission(public.current_user_id(), 'payment_settings.read'::text));
drop policy if exists settings_update on public.payment_settings;
create policy settings_update on public.payment_settings for UPDATE to public
  using (has_permission(public.current_user_id(), 'payment_settings.update'::text));
drop policy if exists reviews_delete on public.product_reviews;
create policy reviews_delete on public.product_reviews for DELETE to public
  using ((has_permission(public.current_user_id(), 'product_reviews.delete'::text) AND (user_id = public.current_user_id())));
drop policy if exists reviews_insert on public.product_reviews;
create policy reviews_insert on public.product_reviews for INSERT to public
  with check ((has_permission(public.current_user_id(), 'product_reviews.create'::text) AND (user_id = public.current_user_id())));
drop policy if exists reviews_update on public.product_reviews;
create policy reviews_update on public.product_reviews for UPDATE to public
  using ((has_permission(public.current_user_id(), 'product_reviews.update'::text) AND (user_id = public.current_user_id())));
drop policy if exists templates_delete on public.product_templates;
create policy templates_delete on public.product_templates for DELETE to public
  using (has_permission(public.current_user_id(), 'templates.delete'::text));
drop policy if exists templates_insert on public.product_templates;
create policy templates_insert on public.product_templates for INSERT to public
  with check (has_permission(public.current_user_id(), 'templates.create'::text));
drop policy if exists templates_read on public.product_templates;
create policy templates_read on public.product_templates for SELECT to public
  using (has_permission(public.current_user_id(), 'templates.read'::text));
drop policy if exists templates_update on public.product_templates;
create policy templates_update on public.product_templates for UPDATE to public
  using (has_permission(public.current_user_id(), 'templates.update'::text));
drop policy if exists products_delete on public.products;
create policy products_delete on public.products for DELETE to public
  using ((has_permission(public.current_user_id(), 'products.delete'::text) AND (seller_id = public.current_user_id())));
drop policy if exists products_insert on public.products;
create policy products_insert on public.products for INSERT to public
  with check ((has_permission(public.current_user_id(), 'products.create'::text) AND (seller_id = public.current_user_id())));
drop policy if exists products_update on public.products;
create policy products_update on public.products for UPDATE to public
  using ((has_permission(public.current_user_id(), 'products.update'::text) AND (seller_id = public.current_user_id())));
drop policy if exists seller_admins_delete on public.seller_admins;
create policy seller_admins_delete on public.seller_admins for DELETE to public
  using ((public.current_user_id() = seller_id));
drop policy if exists seller_admins_insert on public.seller_admins;
create policy seller_admins_insert on public.seller_admins for INSERT to public
  with check (((public.current_user_id() = seller_id) AND (product_id IN ( SELECT products.id
   FROM products
  WHERE (products.seller_id = public.current_user_id())))));
drop policy if exists seller_admins_select on public.seller_admins;
create policy seller_admins_select on public.seller_admins for SELECT to public
  using (((public.current_user_id() = seller_id) OR ((public.current_user_id() = admin_user_id) AND (product_id IN ( SELECT products.id
   FROM products
  WHERE (products.seller_id = seller_admins.seller_id))))));
drop policy if exists seller_admins_update on public.seller_admins;
create policy seller_admins_update on public.seller_admins for UPDATE to public
  using ((public.current_user_id() = seller_id))
  with check (((public.current_user_id() = seller_id) AND (product_id IN ( SELECT products.id
   FROM products
  WHERE (products.seller_id = public.current_user_id())))));
drop policy if exists spm_seller_delete on public.seller_payment_methods;
create policy spm_seller_delete on public.seller_payment_methods for DELETE to public
  using ((public.current_user_id() = seller_id));
drop policy if exists spm_seller_insert on public.seller_payment_methods;
create policy spm_seller_insert on public.seller_payment_methods for INSERT to public
  with check ((public.current_user_id() = seller_id));
drop policy if exists spm_seller_select on public.seller_payment_methods;
create policy spm_seller_select on public.seller_payment_methods for SELECT to public
  using ((public.current_user_id() = seller_id));
drop policy if exists spm_seller_update on public.seller_payment_methods;
create policy spm_seller_update on public.seller_payment_methods for UPDATE to public
  using ((public.current_user_id() = seller_id));
drop policy if exists transfers_read on public.ticket_transfers;
create policy transfers_read on public.ticket_transfers for SELECT to public
  using (((from_user_id = public.current_user_id()) OR (to_user_id = public.current_user_id())));
drop policy if exists user_permissions_delete on public.user_permissions;
create policy user_permissions_delete on public.user_permissions for DELETE to public
  using (has_permission(public.current_user_id(), 'user_permissions.delete'::text));
drop policy if exists user_permissions_insert on public.user_permissions;
create policy user_permissions_insert on public.user_permissions for INSERT to public
  with check (has_permission(public.current_user_id(), 'user_permissions.create'::text));
drop policy if exists user_permissions_read on public.user_permissions;
create policy user_permissions_read on public.user_permissions for SELECT to public
  using (((user_id = public.current_user_id()) OR has_permission(public.current_user_id(), 'user_permissions.read'::text)));
drop policy if exists user_permissions_update on public.user_permissions;
create policy user_permissions_update on public.user_permissions for UPDATE to public
  using (has_permission(public.current_user_id(), 'user_permissions.update'::text));
drop policy if exists profiles_insert on public.user_profiles;
create policy profiles_insert on public.user_profiles for INSERT to public
  with check ((id = public.current_user_id()));
drop policy if exists profiles_update on public.user_profiles;
create policy profiles_update on public.user_profiles for UPDATE to public
  using ((id = public.current_user_id()));
