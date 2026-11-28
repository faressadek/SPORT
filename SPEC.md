# SPORT: Build Spec

The single source of truth for building SPORT and SPORT Admin. **Both agents (Claude Code and Codex) read this file first.**

- Flow diagrams: `docs/sport-flow.png`, `docs/sport-admin-flow.png` (Mermaid sources next to them)
- Your tasks: Claude Code → `tasks/claude-code.md` · Codex → `tasks/codex.md`
- How to run both at once: section 7 below

---

## 1. What we're building

**SPORT** is a sports marketplace.
- **Athletes** find and book courts, coaches, gyms and academies.
- **Operators** (coaches, court owners, gym owners, academy owners) apply, get approved, build a profile and run their business from a dashboard.

**SPORT Admin** is a separate, staff-only app on the same backend. The SPORT team uses it to approve operators, moderate content, handle money and support. It's organized by department.

---

## 2. Stack (defaults, change before Wave 1 if you want)

| Layer | Choice | Why |
|---|---|---|
| Repo | **Turborepo + pnpm** monorepo | Two apps share types and logic, and agents work in separate folders |
| Apps | **Next.js (App Router) + TypeScript**, responsive web / PWA first | Works on phones now. A native Expo app can reuse `packages/shared` and `packages/core` later. |
| UI | **Tailwind + shadcn/ui** in `packages/ui` | Shared by both apps |
| Backend | **Supabase**: Postgres, Auth, Storage, RLS, Edge Functions | One backend for SPORT and SPORT Admin |
| Validation | **Zod** schemas in `packages/shared` | One contract for both agents |
| Payments | **Provider adapter** in `packages/core/payments` | ⚠️ **Decision needed:** pick a provider that supports **marketplace split payouts** in your country (e.g. Stripe Connect, Paymob). Build against the interface with a fake provider until then. |
| Email | Provider adapter (e.g. Resend) | Notifications |
| Tests | Vitest (unit) · Playwright (e2e) | |
| Hosting | Vercel (two projects: `sport`, `sport-admin`) + Supabase | |

The installed toolkit already covers this stack: Supabase, Vercel, Playwright, Context7, frontend-design, Superpowers.

---

## 3. Repo layout and ownership

```
sport/
├─ apps/
│  ├─ web/                    # SPORT (athletes + operators)
│  │  ├─ app/(athlete)/       # CLAUDE CODE
│  │  ├─ app/(operator)/      # CLAUDE CODE
│  │  ├─ app/(auth)/          # CODEX (auth pages + guards)
│  │  ├─ app/api/             # CODEX (route handlers, webhooks)
│  │  ├─ lib/data/            # CODEX (server queries + actions the UI calls)
│  │  └─ mocks/               # CLAUDE CODE (temporary mock data, deleted at the end)
│  └─ admin/                  # SPORT Admin: CODEX
├─ packages/
│  ├─ db/                     # CODEX: migrations, RLS, seed, generated types
│  ├─ shared/                 # CODEX: domain types, Zod schemas, constants (THE CONTRACT)
│  ├─ core/                   # CODEX: booking engine, pricing, payments, state machines
│  └─ ui/                     # CLAUDE CODE: design system, components
├─ e2e/                       # CODEX (Playwright)
├─ docs/                      # diagrams, DESIGN.md (Claude Code writes DESIGN.md)
├─ CONTRACT-REQUESTS.md       # how Claude Code asks Codex for contract changes
├─ CLAUDE.md                  # rules for Claude Code
└─ AGENTS.md                  # rules for Codex
```

**Golden rule:** only edit folders you own. If you need something in a folder you don't own, ask for it (section 7.3).

---

## 4. Product requirements (the agreed list)

### Athlete side
- **R1 Browse as guest.** Anyone can open SPORT and browse everything. Sign-in or sign-up is required **only at checkout** (and for sending an enquiry).
- **R2 Home.** Entry points to Courts, Coaches, Gyms, Academies, My Bookings and Enquiries. A footer **operator link** goes to the for-business page.
- **R3 Operators as accounts.** The Coaches, Gyms and Academies lists show **operator cards**: photo, name, rating, location, starting price. Filters: sport, area, price, rating.
- **R4 Operator profile.** Tapping a card opens a full profile with tabs **About · Portfolio · Packages · Reviews**.
  - Coach: photo, sports, rating, location · bio, years of experience, certifications · training photos and videos, athlete results · sessions and bundles
  - Gym: cover photos, branches, rating · facilities, hours, trainers · gym photos and videos · **membership plans**, free visit
  - Academy: logo, sports, age groups, rating · coaches, method, schedule · team photos, competition results · **programs**, free trial, enrol
- **R5 Packages live on the profile** (as a tab). Tapping one opens the **package / plan / program detail + booking page**.
- **R6 Courts.** Courts keep the **pick venue → branch → time** flow. Venue and branch cards show **2–3 photos per branch** (swipe gallery: surface, lighting, indoor or outdoor).
- **R7 Coach booking.** Package → pick date and time → *does the coach have a listed venue?* Yes: train there. No: use your own location **or add an available court**.
- **R8 Coach + court in one checkout.** Review details and price shows both. The athlete pays **once**, and the payment is **split** between the coach and the court owner. Refunds split the same way.
- **R9 Gyms and Academies reach a result.** Buy a membership or enrol (paid → checkout), **or** send an enquiry, free-visit request or trial request.
- **R10 My Bookings and Enquiries.** Shows every booking and enquiry with its status (pending, confirmed, waiting, replied, cancelled, refunded) and detail.
- **R11 Cancel and reschedule.** From My Bookings, following the operator's policy. A cancellation creates a **refund request** that goes to SPORT Admin → Finance.

### Operator side
- **R12 Operator entry.** Open SPORT → operator link → **for-business page** → sign in or create account → choose what you run (coach, court owner, gym, academy) → submit application → **pending approval**.
- **R13 Application outcomes.** Staff can **approve**, **reject** (with a message), or **ask for changes** (the operator fixes and resubmits, back to pending).
- **R14 First-time setup = profile builder.** After approval and before the dashboard: photos, bio, experience, certifications, portfolio, packages / plans / programs, prices, branches, hours, court photos per branch.
- **R15 Profile goes live.** After setup, the operator appears in athlete lists.
- **R16 Dashboards:**
  - Coach Home: sessions, attendance, schedule, prices
  - Court Owner Home: today's courts, calendar, **walk-ins (block slots)**, bookings, settings
  - Gym Owner Home: enquiries, members, plans, facilities, hours
  - Academy Owner Home: programs, trials, parent enquiries
  - Every dashboard has **Edit profile and packages**.
- **R17 The two sides are connected.** Every athlete action lands on the right dashboard:
  - court booking → Court Owner calendar
  - coach session → Coach Home
  - membership or gym enquiry → Gym Owner Home
  - enrolment, trial or academy enquiry → Academy Owner Home

### SPORT Admin (separate app)
- **R18 Separate app**, on its own domain (e.g. `admin.<domain>`). There's **no link from SPORT**. Staff accounts are **invite-only** and **2FA is required**.
- **R19 Role-based Admin Home.** Each staff member sees only what their role allows.
- **R20 Departments:**
  - **Operations:** applications (approve, reject, ask for changes), live operators (pause, remove)
  - **Moderation:** profiles, photos, reviews, reports
  - **Finance:** all bookings, refund requests (including split refunds), operator payouts
  - **Support:** athlete and operator tickets
  - **Team:** staff accounts, roles and permissions, departments (new ones can be added without code)
- **R21 Activity log:** every staff action recorded (who, what, when, before and after).

---

## 5. Data model (Codex owns it, this is the agreed shape)

Money in **integer minor units** plus a `currency` column. Times stored in **UTC**, with a timezone per branch.

| Table | Key fields |
|---|---|
| `profiles` | user_id, full_name, phone, avatar_url, created_at |
| `operators` | id, owner_user_id, **type** (`coach\|court_owner\|gym\|academy`), display_name, slug, bio, sports[], city/area, rating_avg, rating_count, **status** (`draft\|pending\|changes_requested\|rejected\|approved\|live\|paused`), starting_price |
| `operator_applications` | id, operator_id, submitted_data (jsonb), status, staff_message, reviewed_by, reviewed_at |
| `coach_details` | operator_id, experience_years, certifications (jsonb), listed_branch_id (nullable) |
| `branches` | id, operator_id, name, address, lat/lng, timezone, hours (jsonb) |
| `courts` | id, branch_id, sport, surface, indoor (bool), base_price |
| `media` | id, owner_type (`operator\|branch\|court\|portfolio\|offering`), owner_id, url, kind (`photo\|video`), sort, moderation_status |
| `offerings` | id, operator_id, **kind** (`session\|bundle\|membership_plan\|program\|trial\|free_visit`), title, description, price, duration_min, sessions_count, capacity, age_group, active |
| `availability_rules` | id, owner_type (`court\|coach`), owner_id, weekday, start, end |
| `slot_blocks` | id, court_id or coach operator_id, starts_at, ends_at, **reason** (`walk_in\|booking_hold\|closed`) |
| `bookings` | id, athlete_id, status (`pending_payment\|confirmed\|cancelled\|completed\|refunded\|partially_refunded`), total, currency, created_at |
| `booking_items` | id, booking_id, **operator_id**, offering_id or court_id, starts_at, ends_at, location_type (`listed_venue\|own_location\|booked_court`), amount, status |
| `payments` | id, booking_id, provider, provider_ref, amount, status |
| `payouts` | id, operator_id, period, amount, status |
| `refund_requests` | id, booking_id, requested_by, reason, status (`requested\|approved\|rejected\|paid`) |
| `refund_items` | id, refund_request_id, booking_item_id, amount (**split per operator**) |
| `enquiries` | id, athlete_id, operator_id, offering_id, **kind** (`question\|free_visit\|trial`), status (`waiting\|replied\|booked\|closed`) |
| `messages` | id, enquiry_id, sender_user_id, body, created_at |
| `reviews` | id, booking_id, athlete_id, operator_id, rating, body, moderation_status |
| `reports` | id, reporter_id, target_type, target_id, reason, status |
| `support_tickets` | id, opened_by, role (`athlete\|operator`), subject, status, assigned_staff_id |
| `staff` | user_id, department_id, active, mfa_required |
| `departments` | id, name |
| `roles` / `permissions` / `role_permissions` / `staff_roles` | RBAC (e.g. `applications.review`, `refunds.approve`, `media.moderate`, `staff.manage`) |
| `audit_log` | id, staff_user_id, action, target_type, target_id, before (jsonb), after (jsonb), at |

**RLS:** athletes see their own bookings and enquiries. Operators see their own operator rows and anything that touches them. The public sees `live` operators and approved media only. Staff access goes through `has_permission(perm)` (security definer), never a blanket bypass.

---

## 6. The contract (how the UI talks to data)

Everything the UI needs is a **typed function in `apps/web/lib/data/`**, backed by **Zod schemas and types in `packages/shared`**. Claude Code only ever imports from these two places, never calls Supabase directly from components.

Initial contract (Codex creates the signatures and types in Wave 1; implementations land later):

```ts
// lists & profiles
listOperators(filter: OperatorFilter): Promise<OperatorCard[]>
getOperatorProfile(slug: string): Promise<OperatorProfile>        // about, portfolio, offerings, reviews
listVenues(filter: VenueFilter): Promise<VenueCard[]>             // with branch photos
getBranchAvailability(branchId, date): Promise<CourtSlot[]>
getCoachAvailability(operatorId, date): Promise<CoachSlot[]>

// booking & payments
quoteBooking(input: BookingDraft): Promise<Quote>                 // handles coach + court
createCheckout(input: BookingDraft): Promise<CheckoutSession>
listMyBookings(): Promise<BookingSummary[]>
getBooking(id): Promise<BookingDetail>
cancelBooking(id, reason): Promise<RefundRequest>
rescheduleBooking(id, newSlot): Promise<BookingDetail>

// enquiries
createEnquiry(input: EnquiryInput): Promise<Enquiry>
listMyEnquiries(): Promise<EnquirySummary[]>
sendMessage(enquiryId, body): Promise<Message>

// operator
submitApplication(input: ApplicationInput): Promise<Application>
getMyApplication(): Promise<Application | null>
saveProfileDraft(input: ProfileDraft): Promise<void>
uploadMedia(file, owner): Promise<Media>
upsertOffering(input: OfferingInput): Promise<Offering>
upsertBranch(input: BranchInput): Promise<Branch>
goLive(): Promise<void>
getDashboard(type: OperatorType): Promise<DashboardData>
addWalkIn(courtId, slot): Promise<SlotBlock>
replyToEnquiry(enquiryId, body): Promise<Message>
```

Until a function is implemented, Claude Code uses **typed mocks in `apps/web/mocks/`** with the same signatures, then swaps the import. Mocks get deleted in CC8.

---

## 7. Running Claude Code and Codex at the same time

### 7.1 Setup (once, before Wave 1)
1. Create the repo and run **Codex task CX0** (the scaffold). It's short, and nothing else starts until it's merged.
2. Each agent works on its **own branch, ideally in its own git worktree**:
   ```bash
   git worktree add ../sport-claude -b claude/main
   git worktree add ../sport-codex  -b codex/main
   ```
   Open Claude Code in `../sport-claude` and Codex in `../sport-codex`.
3. One branch per task (`claude/cc2-lists`, `codex/cx3-booking-engine`), each merged to `main` through a PR.

### 7.2 Waves
Tasks in the same row run **at the same time**. Start a wave once the tasks it depends on are merged.

| Wave | Codex | Claude Code |
|---|---|---|
| 0 | **CX0** Scaffold monorepo | wait |
| 1 | **CX1** Schema, RLS, contract types | **CC1** Design system + app shells |
| 2 | **CX2** Auth & roles · **CX7** Lists & profiles data | **CC2** Home + lists · **CC3** Operator profiles |
| 3 | **CX3** Booking engine · **CX4** Checkout & payments | **CC4** Booking flow UI · **CC5** Gyms/Academies + My Bookings |
| 4 | **CX5** Applications & enquiries · **CX6** SPORT Admin app | **CC6** Operator onboarding UI · **CC7** Profile builder |
| 5 | **CX8** E2E tests, CI, hardening, deploy | **CC8** Operator dashboards + remove mocks |

### 7.3 Conflict rules
- **Only edit your own folders** (section 3).
- **Claude Code never edits `packages/shared`, `packages/db`, `packages/core` or `lib/data`.** If it needs a field or function, it adds an entry to `CONTRACT-REQUESTS.md` and keeps working with a mock. Codex checks that file at the start of every task.
- **Only Codex writes migrations.**
- **Only Claude Code edits `packages/ui`.** Codex uses those components in `apps/admin`, and asks for new ones the same way (a section in `CONTRACT-REQUESTS.md`).
- Rebase on `main` before opening a PR. Keep PRs to one task.
- `pnpm typecheck && pnpm lint && pnpm test` must pass before a PR.

### 7.4 Definition of done (every task)
- Acceptance criteria in the task met
- Typecheck, lint and tests pass
- UI tasks: checked in a browser with Playwright at **mobile (390px) and desktop (1280px)**, with screenshots in the PR
- Loading, empty and error states exist for every screen that loads data
- No secrets committed. Env vars documented in `.env.example`.

---

## 8. Open decisions (decide before the wave that needs them)
1. **Payment provider** with split payouts (by Wave 3).
2. **Cancellation policy** defaults: e.g. free cancellation until 24h before, operators can set their own (by Wave 3).
3. **Platform fee** (% per booking) and **payout schedule** (by Wave 3).
4. **Languages:** English only, or English + Arabic with right-to-left layout (by Wave 1, since it affects the design system).
5. **Domain names** for SPORT and SPORT Admin (by Wave 5).
