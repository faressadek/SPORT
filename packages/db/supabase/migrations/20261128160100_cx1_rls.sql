create schema sport_private;
revoke all on schema sport_private from public;
grant usage on schema sport_private to anon, authenticated;

-- Keep ownership lookups independent of caller-visible rows and avoid recursive policies.
create function sport_private.owns_operator(operator_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select from public.operators o
    where o.id = owns_operator.operator_id and o.owner_user_id = (select auth.uid())
  );
$$;

create function sport_private.is_live_operator(operator_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select from public.operators o where o.id = is_live_operator.operator_id and o.status = 'live');
$$;

create function sport_private.owns_booking(booking_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select from public.bookings b
    where b.id = owns_booking.booking_id and b.athlete_id = (select auth.uid())
  );
$$;

create function sport_private.operates_booking(booking_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select from public.booking_items i join public.operators o on o.id = i.operator_id
    where i.booking_id = operates_booking.booking_id and o.owner_user_id = (select auth.uid())
  );
$$;

-- Staff permissions require a verified MFA session, independent of client-supplied profile data.
create function public.has_permission(permission text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal' = 'aal2', false) and exists (
    select from public.staff s
    join public.staff_roles sr on sr.user_id = s.user_id
    join public.role_permissions rp on rp.role_id = sr.role_id
    where s.user_id = (select auth.uid()) and s.active
      and rp.permission_name = has_permission.permission
  );
$$;

revoke execute on all functions in schema sport_private from public;
grant execute on all functions in schema sport_private to anon, authenticated;
revoke execute on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;

-- Service code in later waves will add narrowly scoped write paths for state transitions.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'operators', 'operator_applications', 'coach_details', 'branches', 'courts',
    'media', 'offerings', 'availability_rules', 'slot_blocks', 'bookings', 'booking_items',
    'payments', 'payouts', 'refund_requests', 'refund_items', 'enquiries', 'messages', 'reviews',
    'reports', 'support_tickets', 'staff', 'departments', 'roles', 'permissions',
    'role_permissions', 'staff_roles', 'audit_log'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
    execute format('grant select on public.%I to anon, authenticated', table_name);
  end loop;
end;
$$;

create policy profile_self on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('staff.manage')));

create policy operator_public on public.operators for select to anon, authenticated using (status = 'live');
create policy operator_private on public.operators for select to authenticated
  using (owner_user_id = (select auth.uid()) or (select public.has_permission('operators.manage')));

create policy application_owner_or_reviewer on public.operator_applications for select to authenticated
  using (sport_private.owns_operator(operator_id) or (select public.has_permission('applications.review')));

create policy coach_details_read on public.coach_details for select to anon, authenticated
  using (sport_private.is_live_operator(operator_id) or sport_private.owns_operator(operator_id));
create policy branch_read on public.branches for select to anon, authenticated
  using (sport_private.is_live_operator(operator_id) or sport_private.owns_operator(operator_id));
create policy court_read on public.courts for select to anon, authenticated
  using (sport_private.is_live_operator(operator_id) or sport_private.owns_operator(operator_id));
create policy offering_read on public.offerings for select to anon, authenticated
  using ((active and sport_private.is_live_operator(operator_id)) or sport_private.owns_operator(operator_id));

create policy media_public on public.media for select to anon, authenticated
  using (
    moderation_status = 'approved' and (
      sport_private.is_live_operator(operator_id)
      or exists (select from public.branches b where b.id = branch_id and sport_private.is_live_operator(b.operator_id))
      or exists (select from public.courts c where c.id = court_id and sport_private.is_live_operator(c.operator_id))
      or exists (select from public.offerings o where o.id = offering_id and o.active and sport_private.is_live_operator(o.operator_id))
    )
  );
create policy media_private on public.media for select to authenticated
  using (
    (select public.has_permission('media.moderate'))
    or sport_private.owns_operator(operator_id)
    or exists (select from public.branches b where b.id = branch_id and sport_private.owns_operator(b.operator_id))
    or exists (select from public.courts c where c.id = court_id and sport_private.owns_operator(c.operator_id))
    or exists (select from public.offerings o where o.id = offering_id and sport_private.owns_operator(o.operator_id))
  );

create policy operator_availability on public.availability_rules for select to authenticated
  using (sport_private.owns_operator(coach_id) or exists (
    select from public.courts c where c.id = court_id and sport_private.owns_operator(c.operator_id)
  ));
create policy operator_blocks on public.slot_blocks for select to authenticated
  using (sport_private.owns_operator(coach_id) or exists (
    select from public.courts c where c.id = court_id and sport_private.owns_operator(c.operator_id)
  ));

create policy booking_participants on public.bookings for select to authenticated
  using (athlete_id = (select auth.uid()) or sport_private.operates_booking(id) or (select public.has_permission('bookings.read')));
create policy booking_item_participants on public.booking_items for select to authenticated
  using (sport_private.owns_booking(booking_id) or sport_private.owns_operator(operator_id)
    or (select public.has_permission('bookings.read')));
create policy payment_athlete_or_finance on public.payments for select to authenticated
  using (sport_private.owns_booking(booking_id) or (select public.has_permission('payments.read')));
create policy payout_operator_or_finance on public.payouts for select to authenticated
  using (sport_private.owns_operator(operator_id) or (select public.has_permission('payouts.read')));
create policy refund_request_participants on public.refund_requests for select to authenticated
  using (sport_private.owns_booking(booking_id) or sport_private.operates_booking(booking_id)
    or (select public.has_permission('refunds.approve')));
create policy refund_item_participants on public.refund_items for select to authenticated
  using (
    (select public.has_permission('refunds.approve')) or exists (
      select from public.booking_items i where i.id = booking_item_id
        and (sport_private.owns_booking(i.booking_id) or sport_private.owns_operator(i.operator_id))
    )
  );

create policy enquiry_participants on public.enquiries for select to authenticated
  using (athlete_id = (select auth.uid()) or sport_private.owns_operator(operator_id)
    or (select public.has_permission('support.manage')));
create policy message_enquiry_participants on public.messages for select to authenticated
  using (exists (select from public.enquiries e where e.id = enquiry_id));

-- Review readers do not need the underlying booking or athlete account identifiers.
revoke select on public.reviews from anon, authenticated;
grant select (id, operator_id, rating, body, moderation_status) on public.reviews to anon, authenticated;

create policy review_public on public.reviews for select to anon, authenticated
  using (moderation_status = 'approved' and sport_private.is_live_operator(operator_id));
create policy review_private on public.reviews for select to authenticated
  using (athlete_id = (select auth.uid()) or sport_private.owns_operator(operator_id)
    or (select public.has_permission('reviews.moderate')));
create policy report_author_or_moderator on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.has_permission('reports.moderate')));
create policy ticket_author_or_support on public.support_tickets for select to authenticated
  using (opened_by = (select auth.uid()) or (select public.has_permission('support.manage')));

create policy staff_self_or_team on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_permission('staff.manage')));
create policy departments_team on public.departments for select to authenticated
  using ((select public.has_permission('staff.manage')));
create policy roles_team on public.roles for select to authenticated
  using ((select public.has_permission('staff.manage')));
create policy permissions_team on public.permissions for select to authenticated
  using ((select public.has_permission('staff.manage')));
create policy role_permissions_team on public.role_permissions for select to authenticated
  using ((select public.has_permission('staff.manage')));
create policy staff_roles_team on public.staff_roles for select to authenticated
  using ((select public.has_permission('staff.manage')));
create policy audit_read on public.audit_log for select to authenticated
  using ((select public.has_permission('audit.read')));
