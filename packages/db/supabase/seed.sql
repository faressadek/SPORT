-- Disposable local sample data. The demo password is shared by these local accounts only.
create extension if not exists pgcrypto with schema extensions;

create temporary table seed_operators (
  kind public.operator_type, slug text, name text, area text, sport text, price integer, photo text
);

insert into seed_operators values
  ('coach', 'omar-adel', 'Omar Adel', 'Gleem', 'football', 40000, 'coach-portrait'),
  ('coach', 'mariam-hassan', 'Mariam Hassan', 'Smouha', 'padel', 50000, 'coach-portrait'),
  ('coach', 'youssef-nabil', 'Youssef Nabil', 'Stanley', 'tennis', 45000, 'coach-portrait'),
  ('coach', 'sara-amin', 'Sara Amin', 'Miami', 'swimming', 35000, 'coach-portrait'),
  ('court_owner', 'coastal-courts', 'Coastal Courts', 'Gleem', 'football', 50000, 'football-turf'),
  ('court_owner', 'smouha-padel', 'Smouha Padel', 'Smouha', 'padel', 55000, 'padel-court'),
  ('court_owner', 'stanley-courts', 'Stanley Courts', 'Stanley', 'tennis', 45000, 'indoor-court'),
  ('court_owner', 'montazah-sports', 'Montazah Sports', 'Montazah', 'football', 40000, 'football-night'),
  ('gym', 'gleem-strength', 'Gleem Strength', 'Gleem', 'fitness', 95000, 'gym-floor'),
  ('gym', 'smouha-training', 'Smouha Training', 'Smouha', 'fitness', 120000, 'gym-floor'),
  ('gym', 'stanley-fitness', 'Stanley Fitness', 'Stanley', 'fitness', 85000, 'gym-floor'),
  ('gym', 'miami-conditioning', 'Miami Conditioning', 'Miami', 'fitness', 80000, 'gym-floor'),
  ('academy', 'coastal-football-academy', 'Coastal Football Academy', 'Gleem', 'football', 130000, 'academy-team'),
  ('academy', 'smouha-padel-academy', 'Smouha Padel Academy', 'Smouha', 'padel', 150000, 'padel-court'),
  ('academy', 'stanley-tennis-academy', 'Stanley Tennis Academy', 'Stanley', 'tennis', 115000, 'academy-team'),
  ('academy', 'miami-swim-academy', 'Miami Swim Academy', 'Miami', 'swimming', 105000, 'swim-pool');

with accounts(id, email, full_name) as (
  values
    ('10000000-0000-4000-8000-000000000001'::uuid, 'athlete@sport.example', 'Marwan Ali'),
    ('10000000-0000-4000-8000-000000000002'::uuid, 'athlete-two@sport.example', 'Nour Hassan'),
    ('10000000-0000-4000-8000-000000000003'::uuid, 'finance@sport.example', 'SPORT Finance'),
    ('10000000-0000-4000-8000-000000000004'::uuid, 'admin@sport.example', 'SPORT Admin')
  union all
  select md5('user:' || slug)::uuid, slug || '@sport.example', name from seed_operators
), inserted_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  select '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('sport-local-demo', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', full_name),
    now(), now(), '', '', '', ''
  from accounts returning id, email, raw_user_meta_data
), inserted_identities as (
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  select id::text, id, jsonb_build_object('sub', id, 'email', email, 'email_verified', true), 'email', now(), now()
  from inserted_users
)
insert into public.profiles (user_id, full_name)
select id, raw_user_meta_data ->> 'full_name' from inserted_users;

insert into public.operators (id, owner_user_id, type, display_name, slug, bio, sports, city, area, status, starting_price)
select md5('operator:' || slug)::uuid, md5('user:' || slug)::uuid, kind, name, slug,
  'Sample SPORT listing in ' || area || '.', array[sport], 'Alexandria', area, 'live', price
from seed_operators;

insert into public.operators (id, owner_user_id, type, display_name, slug, city, area)
values (md5('operator:unpublished')::uuid, md5('user:omar-adel')::uuid, 'coach',
  'Unpublished sample', 'unpublished', 'Alexandria', 'Gleem');

insert into public.operator_applications (operator_id, submitted_data)
values (md5('operator:unpublished')::uuid, '{"type":"coach","displayName":"Unpublished sample","city":"Alexandria","area":"Gleem","sports":["football"],"description":"Local draft listing for visibility tests."}');

insert into public.branches (id, operator_id, name, address, hours)
select md5('branch:' || slug)::uuid, md5('operator:' || slug)::uuid, name || ' · ' || area,
  area || ', Alexandria', '{"mon":[{"start":"08:00","end":"22:00"}]}'
from seed_operators where kind <> 'coach';

insert into public.coach_details (operator_id, experience_years, listed_branch_id)
select md5('operator:' || slug)::uuid, 5,
  case when slug = 'mariam-hassan' then md5('branch:smouha-padel')::uuid end
from seed_operators where kind = 'coach';

insert into public.courts (id, branch_id, operator_id, sport, surface, indoor, base_price)
select md5('court:' || slug)::uuid, md5('branch:' || slug)::uuid, md5('operator:' || slug)::uuid,
  sport, case when sport = 'football' then 'Artificial turf' else 'Hard court' end, sport = 'padel', price
from seed_operators where kind = 'court_owner';

insert into public.offerings (id, operator_id, kind, title, price, duration_min)
select md5('offering:' || slug)::uuid, md5('operator:' || slug)::uuid,
  case kind when 'coach' then 'session' when 'gym' then 'membership_plan'
    when 'academy' then 'program' else 'session' end::public.offering_kind,
  case kind when 'coach' then 'Training session' when 'gym' then 'Monthly membership'
    when 'academy' then 'Junior program' else 'Court session' end,
  price, case when kind in ('coach', 'court_owner') then 60 end
from seed_operators;

insert into public.media (owner_type, owner_id, url, kind, moderation_status)
select 'operator', md5('operator:' || slug)::uuid, '/samples/' || photo || '.svg', 'photo', 'approved'
from seed_operators;

insert into public.media (owner_type, owner_id, url, kind, sort, moderation_status)
select 'branch', md5('branch:' || slug)::uuid, '/samples/' || photo || '.svg', 'photo', 0, 'approved'
from seed_operators where kind <> 'coach';

insert into public.media (owner_type, owner_id, url, kind, sort, moderation_status)
select 'branch', md5('branch:' || slug)::uuid,
  '/samples/' || case photo when 'football-turf' then 'football-night' else 'football-turf' end || '.svg',
  'photo', 1, 'approved'
from seed_operators where kind = 'court_owner';

insert into public.media (owner_type, owner_id, url, kind, moderation_status) values
  ('operator', md5('operator:omar-adel')::uuid, '/samples/coach-portrait.svg', 'photo', 'pending'),
  ('operator', md5('operator:unpublished')::uuid, '/samples/coach-portrait.svg', 'photo', 'approved');

insert into public.availability_rules (owner_type, owner_id, weekday, start, "end")
select 'coach', operator_id, day, '08:00', '20:00' from public.coach_details cross join generate_series(0, 6) day;
insert into public.availability_rules (owner_type, owner_id, weekday, start, "end")
select 'court', id, day, '08:00', '22:00' from public.courts cross join generate_series(0, 6) day;

insert into public.bookings (id, athlete_id, status, total) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'confirmed', 40000),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'confirmed', 95000);

insert into public.booking_items (booking_id, operator_id, offering_id, starts_at, ends_at, location_type, amount, status) values
  ('20000000-0000-4000-8000-000000000001', md5('operator:omar-adel')::uuid, md5('offering:omar-adel')::uuid,
    '2027-01-15 10:00:00+00', '2027-01-15 11:00:00+00', 'own_location', 40000, 'confirmed'),
  ('20000000-0000-4000-8000-000000000002', md5('operator:gleem-strength')::uuid, md5('offering:gleem-strength')::uuid,
    null, null, null, 95000, 'confirmed');

insert into public.reviews (booking_id, athlete_id, operator_id, rating, body, moderation_status) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
    md5('operator:omar-adel')::uuid, 5, 'Helpful drills and clear feedback.', 'approved');

insert into public.departments (name) values ('Operations'), ('Moderation'), ('Finance'), ('Support'), ('Team');
insert into public.roles (name) values ('Owner'), ('Operations'), ('Moderation'), ('Finance'), ('Support');
insert into public.permissions (name) values
  ('operators.manage'), ('applications.review'), ('media.moderate'), ('reviews.moderate'), ('reports.moderate'),
  ('bookings.read'), ('payments.read'), ('payouts.read'), ('refunds.approve'), ('support.manage'), ('staff.manage'), ('audit.read');

insert into public.role_permissions (role_id, permission_name)
select r.id, p.name from public.roles r cross join public.permissions p
where r.name = 'Owner'
   or (r.name = 'Operations' and p.name in ('operators.manage', 'applications.review'))
   or (r.name = 'Moderation' and p.name in ('media.moderate', 'reviews.moderate', 'reports.moderate'))
   or (r.name = 'Finance' and p.name in ('bookings.read', 'payments.read', 'payouts.read', 'refunds.approve'))
   or (r.name = 'Support' and p.name = 'support.manage');

insert into public.staff (user_id, department_id)
select '10000000-0000-4000-8000-000000000003', id from public.departments where name = 'Finance';
insert into public.staff_roles (user_id, role_id)
select '10000000-0000-4000-8000-000000000003', id from public.roles where name = 'Finance';

drop table seed_operators;

insert into public.staff (user_id, department_id)
select '10000000-0000-4000-8000-000000000004', id from public.departments where name = 'Team';
insert into public.staff_roles (user_id, role_id)
select '10000000-0000-4000-8000-000000000004', id from public.roles where name = 'Owner';
