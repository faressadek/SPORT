create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

create type public.operator_type as enum ('coach', 'court_owner', 'gym', 'academy');
create type public.operator_status as enum ('draft', 'pending', 'changes_requested', 'rejected', 'approved', 'live', 'paused');
create type public.application_status as enum ('draft', 'pending', 'changes_requested', 'rejected', 'approved');
create type public.media_owner_type as enum ('operator', 'branch', 'court', 'portfolio', 'offering');
create type public.media_kind as enum ('photo', 'video');
create type public.moderation_status as enum ('pending', 'approved', 'rejected');
create type public.offering_kind as enum ('session', 'bundle', 'membership_plan', 'program', 'trial', 'free_visit');
create type public.availability_owner_type as enum ('court', 'coach');
create type public.slot_block_reason as enum ('walk_in', 'booking_hold', 'closed');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'completed', 'refunded', 'partially_refunded');
create type public.booking_location_type as enum ('listed_venue', 'own_location', 'booked_court');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded');
create type public.payout_status as enum ('pending', 'paid', 'failed');
create type public.refund_status as enum ('requested', 'approved', 'rejected', 'paid');
create type public.enquiry_kind as enum ('question', 'free_visit', 'trial');
create type public.enquiry_status as enum ('waiting', 'replied', 'booked', 'closed');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.ticket_role as enum ('athlete', 'operator');
create type public.ticket_status as enum ('open', 'in_progress', 'closed');
create domain public.currency_code as text check (value ~ '^[A-Z]{3}$');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(user_id),
  type public.operator_type not null,
  display_name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  bio text not null default '',
  sports text[] not null default '{}',
  city text not null,
  area text not null,
  rating_avg numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  status public.operator_status not null default 'draft',
  starting_price integer check (starting_price >= 0),
  currency public.currency_code not null default 'EGP',
  unique (id, type)
);
create index operators_catalog_idx on public.operators (type, status, city);
create index operators_owner_idx on public.operators (owner_user_id);

create table public.operator_applications (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  submitted_data jsonb not null default '{}',
  status public.application_status not null default 'draft',
  staff_message text,
  reviewed_by uuid references public.profiles(user_id),
  reviewed_at timestamptz
);
create index operator_applications_operator_idx on public.operator_applications (operator_id);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  name text not null,
  address text not null,
  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  timezone text not null default 'Africa/Cairo',
  hours jsonb not null default '{}',
  check ((lat is null) = (lng is null)),
  unique (id, operator_id)
);
create index branches_operator_idx on public.branches (operator_id);

create table public.coach_details (
  operator_id uuid primary key,
  operator_type public.operator_type generated always as ('coach'::public.operator_type) stored,
  experience_years integer not null default 0 check (experience_years >= 0),
  certifications jsonb not null default '[]',
  listed_branch_id uuid references public.branches(id),
  foreign key (operator_id, operator_type) references public.operators(id, type)
);

create table public.courts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null,
  operator_id uuid not null,
  sport text not null,
  surface text not null,
  indoor boolean not null default false,
  base_price integer not null check (base_price >= 0),
  currency public.currency_code not null default 'EGP',
  foreign key (branch_id, operator_id) references public.branches(id, operator_id),
  unique (id, operator_id)
);
create index courts_branch_idx on public.courts (branch_id);

create table public.offerings (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  kind public.offering_kind not null,
  title text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  currency public.currency_code not null default 'EGP',
  duration_min integer check (duration_min > 0),
  sessions_count integer check (sessions_count > 0),
  capacity integer check (capacity > 0),
  age_group text,
  active boolean not null default true,
  unique (id, operator_id)
);
create index offerings_operator_idx on public.offerings (operator_id);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  owner_type public.media_owner_type not null,
  owner_id uuid not null,
  url text not null,
  kind public.media_kind not null,
  sort integer not null default 0 check (sort >= 0),
  moderation_status public.moderation_status not null default 'pending',
  operator_id uuid generated always as (case when owner_type in ('operator', 'portfolio') then owner_id end) stored references public.operators(id),
  branch_id uuid generated always as (case when owner_type = 'branch' then owner_id end) stored references public.branches(id),
  court_id uuid generated always as (case when owner_type = 'court' then owner_id end) stored references public.courts(id),
  offering_id uuid generated always as (case when owner_type = 'offering' then owner_id end) stored references public.offerings(id)
);
create index media_owner_idx on public.media (owner_type, owner_id, sort);

create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  owner_type public.availability_owner_type not null,
  owner_id uuid not null,
  weekday smallint not null check (weekday between 0 and 6),
  start time not null,
  "end" time not null,
  court_id uuid generated always as (case when owner_type = 'court' then owner_id end) stored references public.courts(id),
  coach_id uuid generated always as (case when owner_type = 'coach' then owner_id end) stored,
  coach_type public.operator_type generated always as ('coach'::public.operator_type) stored,
  foreign key (coach_id, coach_type) references public.operators(id, type),
  check (start < "end"),
  unique (owner_type, owner_id, weekday, start, "end")
);

create table public.slot_blocks (
  id uuid primary key default gen_random_uuid(),
  court_id uuid references public.courts(id),
  coach_id uuid,
  coach_type public.operator_type generated always as ('coach'::public.operator_type) stored,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason public.slot_block_reason not null,
  foreign key (coach_id, coach_type) references public.operators(id, type),
  check (num_nonnulls(court_id, coach_id) = 1),
  check (starts_at < ends_at)
);
create index slot_blocks_court_range_idx on public.slot_blocks
  using gist (court_id extensions.gist_uuid_ops, tstzrange(starts_at, ends_at, '[)')) where court_id is not null;
create index slot_blocks_coach_range_idx on public.slot_blocks
  using gist (coach_id extensions.gist_uuid_ops, tstzrange(starts_at, ends_at, '[)')) where coach_id is not null;

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(user_id),
  status public.booking_status not null default 'pending_payment',
  total integer not null check (total >= 0),
  currency public.currency_code not null default 'EGP',
  created_at timestamptz not null default now(),
  unique (id, athlete_id)
);
create index bookings_athlete_idx on public.bookings (athlete_id);

create table public.booking_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  operator_id uuid not null references public.operators(id),
  offering_id uuid,
  court_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  location_type public.booking_location_type,
  amount integer not null check (amount >= 0),
  currency public.currency_code not null default 'EGP',
  status public.booking_status not null default 'pending_payment',
  foreign key (offering_id, operator_id) references public.offerings(id, operator_id),
  foreign key (court_id, operator_id) references public.courts(id, operator_id),
  unique (id, booking_id),
  check (num_nonnulls(offering_id, court_id) = 1),
  check ((starts_at is null and ends_at is null and court_id is null)
      or (starts_at is not null and ends_at is not null and starts_at < ends_at))
);
create index booking_items_booking_idx on public.booking_items (booking_id);
create index booking_items_operator_range_idx on public.booking_items
  using gist (operator_id extensions.gist_uuid_ops, tstzrange(starts_at, ends_at, '[)')) where starts_at is not null;
create index booking_items_court_range_idx on public.booking_items
  using gist (court_id extensions.gist_uuid_ops, tstzrange(starts_at, ends_at, '[)')) where court_id is not null;

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  provider text not null,
  provider_ref text not null,
  amount integer not null check (amount >= 0),
  currency public.currency_code not null default 'EGP',
  status public.payment_status not null default 'pending',
  unique (provider, provider_ref)
);
create index payments_booking_idx on public.payments (booking_id);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.operators(id),
  period date not null,
  amount integer not null check (amount >= 0),
  currency public.currency_code not null default 'EGP',
  status public.payout_status not null default 'pending',
  unique (operator_id, period, currency)
);

create table public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id),
  requested_by uuid not null references public.profiles(user_id),
  reason text not null,
  status public.refund_status not null default 'requested',
  unique (id, booking_id)
);
create index refund_requests_booking_idx on public.refund_requests (booking_id);

create table public.refund_items (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  refund_request_id uuid not null,
  booking_item_id uuid not null,
  amount integer not null check (amount >= 0),
  currency public.currency_code not null default 'EGP',
  foreign key (refund_request_id, booking_id) references public.refund_requests(id, booking_id),
  foreign key (booking_item_id, booking_id) references public.booking_items(id, booking_id),
  unique (refund_request_id, booking_item_id)
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.profiles(user_id),
  operator_id uuid not null references public.operators(id),
  offering_id uuid,
  kind public.enquiry_kind not null,
  status public.enquiry_status not null default 'waiting',
  foreign key (offering_id, operator_id) references public.offerings(id, operator_id)
);
create index enquiries_athlete_idx on public.enquiries (athlete_id);
create index enquiries_operator_idx on public.enquiries (operator_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries(id),
  sender_user_id uuid not null references public.profiles(user_id),
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);
create index messages_enquiry_idx on public.messages (enquiry_id, created_at);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null,
  athlete_id uuid not null,
  operator_id uuid not null references public.operators(id),
  rating integer not null check (rating between 1 and 5),
  body text not null default '',
  moderation_status public.moderation_status not null default 'pending',
  foreign key (booking_id, athlete_id) references public.bookings(id, athlete_id),
  unique (booking_id, operator_id)
);
create index reviews_operator_idx on public.reviews (operator_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(user_id),
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status public.report_status not null default 'open'
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.staff (
  user_id uuid primary key references public.profiles(user_id),
  department_id uuid not null references public.departments(id),
  active boolean not null default true,
  mfa_required boolean not null default true
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid not null references public.profiles(user_id),
  role public.ticket_role not null,
  subject text not null,
  status public.ticket_status not null default 'open',
  assigned_staff_id uuid references public.staff(user_id)
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.permissions (
  name text primary key
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_name text not null references public.permissions(name) on delete cascade,
  primary key (role_id, permission_name)
);

create table public.staff_roles (
  user_id uuid not null references public.staff(user_id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  primary key (user_id, role_id)
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.staff(user_id),
  action text not null,
  target_type text not null,
  target_id uuid not null,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);
create index audit_log_at_idx on public.audit_log (at desc);
