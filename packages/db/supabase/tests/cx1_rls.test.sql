begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(19);
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0, 'every public table has row-level security'
);
insert into public.refund_requests (id, booking_id, requested_by, reason)
values ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001', 'Local integrity test');
select throws_ok(
  $$insert into public.refund_items (booking_id, refund_request_id, booking_item_id, amount)
    select '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', id, 100
    from public.booking_items where booking_id = '20000000-0000-4000-8000-000000000002'$$,
  '23503', null, 'refund items cannot reference a different booking'
);
set local role anon;
select is((select count(*)::int from public.operators where status = 'live'), 16, 'public sees the live catalog');
select is((select count(*)::int from public.operators where status <> 'live'), 0, 'public cannot see unpublished operators');
select is((select count(*)::int from public.media where moderation_status <> 'approved'), 0, 'public cannot see unapproved media');
select is((select count(*)::int from public.media where owner_id = md5('operator:unpublished')::uuid), 0,
  'approved media belonging to an unpublished operator is hidden');
select is((select count(*)::int from public.bookings), 0, 'public sees no bookings');
select is((select count(id)::int from public.reviews), 1, 'public sees an approved review');
select throws_ok(
  $$select booking_id from public.reviews$$, '42501', 'permission denied for table reviews',
  'public cannot read review booking identifiers'
);
reset role;
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}';
select is((select count(*)::int from public.bookings), 1, 'athlete sees only their booking');
select is((select count(*)::int from public.booking_items), 1, 'athlete sees only their booking item');
select throws_ok(
  $$update public.bookings set status = 'confirmed'$$, '42501', 'permission denied for table bookings',
  'athlete cannot write booking state through the database API'
);
do $$ begin
  perform set_config('request.jwt.claims',
  jsonb_build_object('sub', md5('user:omar-adel')::uuid, 'role', 'authenticated', 'aal', 'aal1')::text, true);
end $$;
select is((select count(*)::int from public.operators where status = 'draft'), 1, 'operator can read their draft');
select is((select count(*)::int from public.bookings), 1, 'operator sees only bookings touching their business');
select is((select count(*)::int from public.booking_items), 1, 'operator sees only their own booking items');
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}';
select is(public.has_permission('bookings.read'), false, 'staff without MFA cannot use permissions');
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal2"}';
select is((select count(*)::int from public.bookings), 2, 'authorized staff can read bookings');
select is(public.has_permission('staff.manage'), false, 'finance permission does not grant team management');
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated","aal":"aal2"}';
select is(public.has_permission('staff.manage'), true, 'the seeded Owner can manage the team');
reset role;
select * from finish();
rollback;
