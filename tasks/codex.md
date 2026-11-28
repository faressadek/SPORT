# Codex tasks: backend, data, payments, SPORT Admin

Read `SPEC.md` first. You own: `packages/db`, `packages/shared`, `packages/core`, `apps/web/app/(auth)`, `apps/web/app/api`, `apps/web/lib/data`, `apps/admin`, `e2e/`.
At the start of **every** task, read `CONTRACT-REQUESTS.md` and handle anything open for you.

Prompt to start each task in Codex:
> Read SPEC.md, AGENTS.md and tasks/codex.md. Do task CXn. Work on branch `codex/cxn-<name>`. Follow the conflict rules in SPEC.md 7.3. When done, confirm every acceptance criterion and open a PR.

---

## CX0 · Scaffold the monorepo (setup, do first, short)
**Wave 0 · blocks everything**

Build:
- Turborepo + pnpm workspace: `apps/web`, `apps/admin` (both Next.js App Router + TS + Tailwind), `packages/db`, `packages/shared`, `packages/core`, `packages/ui` (empty package with Tailwind + shadcn config, which Claude Code fills in).
- Shared `tsconfig`, ESLint, Prettier. Root scripts: `dev`, `build`, `typecheck`, `lint`, `test`.
- Supabase local setup in `packages/db` (`supabase init`). `.env.example` for both apps.
- Empty `CONTRACT-REQUESTS.md` with two sections: *For Codex* / *For Claude Code*.
- Copy `docs/` from this kit into the repo.

Done when: `pnpm dev` runs both apps (web on :3000, admin on :3001), `pnpm typecheck` passes, and it's merged to `main`.

---

## CX1 · Database schema, RLS and the contract
**Wave 1 · parallel with CC1 · depends on CX0**

Build:
- Migrations for **every table in SPEC.md section 5**, with enums, foreign keys, indexes (operator type/status/city, booking_items time ranges, slot_blocks time ranges).
- **RLS on every table** as described in SPEC 5, plus a `has_permission(text)` security-definer function for staff.
- Generated DB types into `packages/db`.
- `packages/shared`: domain types plus **Zod schemas** for everything in SPEC section 6 (`OperatorCard`, `OperatorProfile`, `Quote`, `BookingDraft`, `EnquiryInput`, `ProfileDraft`, ...).
- `apps/web/lib/data/`: **every function signature from SPEC 6**, typed, throwing `NotImplemented` for now. This is what lets Claude Code build against stable types right away.
- Seed script: 4 operators of each type, branches with photos, offerings, an athlete, a staff admin.

Done when: `supabase db reset` runs cleanly with seed data, RLS tests prove an athlete can't read another athlete's booking and the public can't see non-`live` operators, and all contract types are exported.

Use: Supabase plugin, `postgres-best-practices` skill, Context7.

---

## CX2 · Auth, accounts and roles
**Wave 2 · parallel with CX7, CC2, CC3 · depends on CX1**

Build:
- Supabase Auth (email + phone OTP or email magic link, plus Google). `profiles` row created on sign-up.
- **Guest browsing:** no auth needed on public routes. A `requireUser()` guard used **only** at checkout, enquiries, My Bookings and operator areas, returning to the page the user came from after sign-in.
- `(auth)` pages: sign in, sign up, reset. Use `packages/ui` components, or simple placeholders if they aren't ready yet.
- Operator role: a user who owns an `operators` row. A guard for operator routes based on operator status (pending, approved, live).
- **Staff auth for SPORT Admin:** invite-only, **TOTP 2FA required**, separate login page in `apps/admin`, and a staff session check.
- RBAC helpers in `packages/core/auth`: `can(user, permission)`, plus seed roles (Owner, Operations, Moderation, Finance, Support).

Done when: a guest can browse and is sent to sign-in at checkout then back again, a non-staff user can't open any admin page, a staff member without 2FA can't get in, and permission checks have unit tests.

---

## CX3 · Availability and booking engine
**Wave 3 · parallel with CX4, CC4, CC5 · depends on CX1, CX2**

Build in `packages/core/booking` (pure, unit-tested logic) and wire it into `lib/data`:
- **Court slots** per branch and date from `availability_rules` minus bookings and `slot_blocks` (walk-ins, holds, closed). Respect the branch timezone.
- **Coach slots** from coach rules minus bookings.
- **Coach + court:** when the coach has no listed venue and the athlete adds a court, check **both** are free for the same time range.
- **Holds:** creating a checkout places a `booking_hold` block (e.g. 10 min) so two people can't book the same slot. Expired holds get released.
- **No double booking:** enforced in the database too (an exclusion constraint on time ranges per court or coach).
- `rescheduleBooking` and `cancelBooking`, following the cancellation policy (SPEC open decision 2). Cancelling creates a `refund_request` with `refund_items` split per operator.
- Implement `getBranchAvailability`, `getCoachAvailability`, `rescheduleBooking`, `cancelBooking`, `addWalkIn`.

Done when: unit tests cover overlaps, timezones, holds expiring, coach + court together and a walk-in blocking a slot, and a concurrency test shows two simultaneous checkouts for one slot leave exactly one booking.

---

## CX4 · Pricing, checkout and payments
**Wave 3 · parallel with CX3, CC4, CC5 · depends on CX1, CX2**

Build in `packages/core/payments` and `packages/core/pricing`:
- `quoteBooking`: line items per operator (coach session + court), platform fee, total. Same function used for display and for charging.
- **Payment provider interface** (`createPayment`, `handleWebhook`, `refund`, `payout`) plus a **FakeProvider** for dev and tests. Real provider adapter once SPEC open decision 1 is made.
- `createCheckout`: booking (`pending_payment`) + items + hold → provider session. A webhook at `app/api/payments/webhook` confirms the booking, records the payment and marks items confirmed.
- **Split:** each `booking_item` carries its operator and amount, and the payout ledger accrues per operator.
- Refund execution (used by Admin Finance in CX6): refunds each `refund_item` separately.
- Memberships (gym) and enrolments (academy) go through the same checkout.

Done when: the full fake-provider flow works (quote → checkout → webhook → confirmed), a coach + court booking makes two items for two operators with the right amounts, a failed payment releases the hold, and webhooks are idempotent (the same event twice changes nothing the second time).

---

## CX5 · Operator applications, enquiries and notifications
**Wave 4 · parallel with CX6, CC6, CC7 · depends on CX2**

Build:
- **Application state machine** in `packages/core/applications`: `draft → pending → approved | rejected | changes_requested → pending (resubmit)`. Implement `submitApplication`, `getMyApplication`, and staff actions `approve`, `reject(message)`, `requestChanges(message)`.
- Approval moves the operator to `approved`, which unlocks first-time setup. `goLive()` checks the profile is complete (at least one photo, bio, one offering, plus hours/branch for courts and gyms) before setting `live`.
- **Profile builder data:** `saveProfileDraft`, `uploadMedia` (Supabase Storage, size and type limits, new media `pending` moderation), `upsertOffering`, `upsertBranch`.
- **Enquiries:** `createEnquiry` (question, free visit, trial), `listMyEnquiries`, `sendMessage`, `replyToEnquiry`, with status updates (`waiting → replied → booked | closed`).
- **Notifications** (email adapter + in-app `notifications` table): application decision, new booking for the operator, new enquiry for the operator, operator reply for the athlete, refund status.
- `getDashboard(type)` for the 4 operator types: today's sessions or courts, upcoming bookings, enquiries, members/enrolments, attendance.

Done when: the full application loop works including ask for changes → resubmit, `goLive` refuses incomplete profiles, an enquiry shows up for the operator and the reply shows up for the athlete, and notifications fire, verified with the email adapter in test mode.

---

## CX6 · SPORT Admin app
**Wave 4 · parallel with CX5, CC6, CC7 · depends on CX2, CX4; uses `packages/ui`**

Build `apps/admin` (see `docs/sport-admin-flow.png`):
- Staff login (from CX2), and an **Admin Home showing only the departments the staff member's permissions allow**.
- **Operations:** application queue (filter by type and status), application detail with approve, reject or ask for changes plus a message box, and a live operators list with pause and remove.
- **Moderation:** media queue (approve or reject), reviews, reports.
- **Finance:** all bookings (search and filter), refund requests (approve or reject, showing split items, executing through CX4), payouts ledger.
- **Support:** tickets list and detail, assign, reply, close.
- **Team:** invite staff, assign departments and roles, edit role permissions, **create new departments without code**.
- **Activity log:** every write action above goes to `audit_log` (who, what, before, after), viewable and filterable.
- Use `packages/ui` components. If one is missing, request it in `CONTRACT-REQUESTS.md` and use a plain fallback.

Done when: a Finance-only staff member can't see Operations, every staff action creates an audit entry, approving an application changes the operator's status in SPORT, and approving a split refund refunds both operators' items.

---

## CX7 · Lists, profiles and search data
**Wave 2 · parallel with CX2, CC2, CC3 · depends on CX1**

Implement in `lib/data`:
- `listOperators(filter)`: `live` operators only, filters (type, sport, area, price range, rating), sort (rating, price, nearest when lat/lng is given), pagination, card fields (photo, name, rating, area, **starting price** = cheapest active offering).
- `getOperatorProfile(slug)`: about, approved portfolio media, active offerings grouped for the Packages tab, reviews + rating summary, branches (gyms and academies), listed venue (coaches).
- `listVenues(filter)`: court-owner branches with **2–3 approved photos per branch**, sports, indoor/outdoor, starting price.
- Image delivery: Supabase Storage with transformed thumbnails for cards, full size for galleries.
- Server-side caching where it's safe (public lists), invalidated when a profile, offering or media changes.

Done when: queries are typed against `packages/shared`, filters and pagination are covered by tests on seed data, no `draft`, `pending` or `paused` operator or unmoderated photo ever appears, and lists respond in under ~300ms on seed data.

---

## CX8 · End-to-end tests, CI, hardening and deploy
**Wave 5 · parallel with CC8 · depends on everything**

Build:
- **Playwright e2e** for the main journeys (mobile + desktop):
  1. Guest browses coaches → profile → package → time → sign in at checkout → pays (fake) → sees it in My Bookings
  2. Coach without a venue + added court → one payment, two operators see it on their dashboards
  3. Court booking, then the court owner adds a walk-in, and that slot is no longer offered
  4. Gym enquiry → operator replies → athlete sees the reply
  5. Operator applies → staff asks for changes → resubmits → approved → builds profile → goes live → appears in the list
  6. Athlete cancels → refund request → Finance approves the split refund
  7. Staff permissions: Support staff can't open Finance
- **CI** (GitHub Actions): install, typecheck, lint, unit tests, Supabase local + e2e on every PR.
- **Security pass:** RLS review for every table, rate limits on auth, enquiry and checkout endpoints, upload validation, no service key in the client, security headers. Run the `security-guidance` / `code-review` tools.
- **Deploy:** two Vercel projects (`sport`, `sport-admin`), env vars documented, Supabase production migration steps in `docs/DEPLOY.md`.

Done when: all 7 journeys pass in CI and both apps deploy to preview URLs from a PR.
