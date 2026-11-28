# Claude Code tasks: design system, athlete app, operator app

Read `SPEC.md` first. You own: `packages/ui`, `apps/web/app/(athlete)`, `apps/web/app/(operator)`, `apps/web/mocks`, `docs/DESIGN.md`.
**Never edit** `packages/shared`, `packages/db`, `packages/core` or `apps/web/lib/data`. Import from them. If you need a field or function that isn't there, add it to `CONTRACT-REQUESTS.md` → *For Codex* and use a typed mock in `apps/web/mocks/` until it lands.

Prompt to start each task in Claude Code:
> Read SPEC.md, CLAUDE.md and tasks/claude-code.md. Do task CCn. Work on branch `claude/ccn-<name>`. Plan with Superpowers first, follow the conflict rules in SPEC.md 7.3, and check every screen with Playwright at 390px and 1280px before saying it's done. Then open a PR.

Every screen needs: **loading** (skeleton), **empty**, **error** and **success** states, keyboard and screen-reader basics, and 44px touch targets.

---

## CC1 · Design system and app shells
**Wave 1 · parallel with CX1 · depends on CX0**

Build:
- `docs/DESIGN.md`: the visual direction for SPORT. Energetic and athletic but clean, not generic AI purple gradients. Cover colors with roles (light and dark), type scale, spacing, radius, shadows and motion. Decide RTL support now if Arabic is planned (SPEC open decision 4).
- `packages/ui` tokens (Tailwind theme) plus components: Button, Input, Select, Tabs, Card, **OperatorCard**, **VenueCard** (with photo swipe gallery), **PhotoGallery** (swipe + full-screen), Rating, PriceTag, Badge/StatusPill, Avatar, Sheet/Dialog, Toast, Skeleton, EmptyState, ErrorState, DatePicker, **TimeSlotGrid**, Stepper, FileUploader (drag, preview, progress), DataTable (for dashboards and admin), Calendar (day/week view for court owners).
- App shells: athlete layout (top bar, bottom nav on mobile: Home · Search · My Bookings · Account, footer with the **operator link**), operator layout (sidebar on desktop, tabs on mobile). Also a basic admin layout for Codex to use in `apps/admin`.
- A `/dev/ui` page in `apps/web` showing every component and state.

Done when: every component renders on `/dev/ui` at mobile and desktop in light and dark, contrast passes WCAG AA, and the components are exported from `packages/ui`.

Use: `frontend-design`, `web-design-guidelines`, shadcn MCP, Context7, Playwright.

---

## CC2 · Athlete Home, lists and courts
**Wave 2 · parallel with CC3, CX2, CX7 · depends on CC1**

Build in `(athlete)`:
- **Home** (works for guests): Courts, Coaches, Gyms and Academies entry points, featured operators, a shortcut to My Bookings when signed in, and the footer operator link to `/for-business`.
- **Coaches, Gyms and Academies list pages:** a grid or list of **OperatorCard** (photo, name, rating, area, starting price), filters (sport, area, price, rating) as a sheet on mobile and a sidebar on desktop, sort, infinite scroll or pagination, with filters stored in the URL.
- **Courts:** venue list using **VenueCard with 2–3 photos per branch** (swipe), then venue → branch → date → **TimeSlotGrid** (slot selection leads into CC4's review page).
- Data: `listOperators`, `listVenues` and `getBranchAvailability`, using mocks until CX7 and CX3 land.

Done when: a guest can open Home → any list → filter → open a card (links to CC3), and Courts → pick a venue, branch, date and slot, with every state designed and screenshots at both sizes.

---

## CC3 · Operator profile pages (athlete view)
**Wave 2 · parallel with CC2, CX2, CX7 · depends on CC1**

Build `(athlete)/[type]/[slug]`:
- Header: cover photo or gallery, avatar or logo, name, sports, rating, area, and a primary CTA ("See packages").
- Tabs **About · Portfolio · Packages · Reviews**, with sticky tabs and deep links (`?tab=packages`).
  - **Coach:** bio, years of experience, certifications, listed venue · training photos and videos, athlete results · sessions and bundles
  - **Gym:** facilities, hours, branches, trainers · gym photos and videos · **membership plans** + free visit
  - **Academy:** coaches, method, age groups, schedule · team photos, competition results · **programs** + free trial + enrol
- Portfolio: masonry grid that opens the full-screen PhotoGallery, with video support.
- Packages tab: offering cards (title, what's included, duration or sessions, price). Tapping one opens the **detail page** `(athlete)/[type]/[slug]/[offeringId]`, built in CC4/CC5.
- Reviews: rating summary plus a list.
- Share link + good page metadata (Open Graph image = cover photo).

Done when: all three profile types render from `getOperatorProfile` (mock first), tabs work by deep link, the gallery works with touch and keyboard, and screenshots are in the PR.

---

## CC4 · Booking flow UI (courts and coaches)
**Wave 3 · parallel with CC5, CX3, CX4 · depends on CC2, CC3**

Build:
- **Coach package detail:** what's included → pick date → **TimeSlotGrid** (`getCoachAvailability`) → **"Where will you train?"**
  - coach has a listed venue: show it, train there
  - no listed venue: choose **Your own location** (address input) **or Add an available court**, which shows courts free at the same time near the athlete
- **Review details and price:** every line item (coach session, court) with operator name, time, place, price, platform fee and total, from `quoteBooking`. Shows the cancellation policy.
- **Sign-in gate:** a guest is sent to sign-in here, then returned to this exact review page with their selection kept.
- **Checkout** (`createCheckout` → provider page or fake), and the **confirmation page** with booking summary, add to calendar, and a link to My Bookings.
- Court bookings from CC2 use the same review → checkout → confirmation pages.
- Handle a slot taken during checkout ("That time was just booked, pick another").

Done when: guest → coach → package → time → no venue → add court → review shows two items → sign in → returns → checkout → confirmation works on mocks and then on the real CX3/CX4 functions.

---

## CC5 · Gym and Academy actions + My Bookings and Enquiries
**Wave 3 · parallel with CC4, CX3, CX4 · depends on CC3**

Build:
- **Gym plan detail** and **Academy program detail:** what's included, price, schedule or age group, then two clear paths:
  - **Buy membership / Enrol** → the CC4 review → checkout pages
  - **Free visit / Free trial / Ask a question** → a short enquiry form (`createEnquiry`, sign-in required) → "Sent, you'll see the reply in My Bookings and Enquiries"
- **My Bookings and Enquiries** (signed in): tabs **Upcoming · Past · Enquiries**. Each booking card shows a status pill (pending, confirmed, cancelled, refunded).
- **Booking detail:** items, place (with map link), time, price, operator contact, and actions **Reschedule** (TimeSlotGrid → `rescheduleBooking`) and **Cancel** (policy shown, confirmation dialog, `cancelBooking`) → refund request status shown.
- **Enquiry thread:** messages with the operator (`sendMessage`), status (waiting, replied, booked), and a "Book now" button if the operator offers it.

Done when: both gym and academy paths reach either checkout or a sent enquiry, cancel shows the refund request status, reschedule only offers free slots, and the enquiry thread updates after a reply.

---

## CC6 · Operator onboarding UI
**Wave 4 · parallel with CC7, CX5, CX6 · depends on CC1**

Build in `(operator)` (see `docs/sport-flow.png`, purple path):
- **`/for-business` landing page:** what SPORT offers coaches, court owners, gyms and academies, how it works (apply → approved → build profile → get bookings), FAQ, and an "Apply" CTA. Make it convincing. Use `website-design` / `landing-page` skills if installed.
- Sign in or create account (CX2 pages), then **Choose what you run:** 4 big choice cards.
- **Application form** per type (Stepper): basics, sports, location or branches, experience or certifications (coach), business details, a couple of photos, then `submitApplication`.
- **Status screens:** Pending ("we're reviewing, usually within X days"), **Changes requested** (shows the staff message plus the form pre-filled to fix and resubmit), **Rejected** (staff message, contact support), **Approved** (→ "Build your profile", leading into CC7).

Done when: all four operator types can apply, every application status has its screen, and ask for changes → edit → resubmit works on mocks and then on CX5.

---

## CC7 · Profile builder (first-time setup + edit later)
**Wave 4 · parallel with CC6, CX5, CX6 · depends on CC1, CC3**

Build `(operator)/setup` as a guided Stepper with a **live preview of the public profile** (reuse the CC3 components):
1. **Photos:** avatar or logo, cover, portfolio (FileUploader, reorder, captions, video). Shows "pending review" per item.
2. **About:** bio, sports, experience years, certifications (coach); facilities and trainers (gym); method, age groups and coaches (academy).
3. **Branches and hours** (court owner, gym, academy): address, map pin, opening hours, and for court owners **courts per branch** with sport, surface, indoor/outdoor and **2–3 photos per branch**.
4. **Packages:** sessions and bundles (coach), membership plans + free visit (gym), programs + trial (academy), court pricing (court owner), each with title, inclusions, price, duration or sessions, active toggle.
5. **Policies:** cancellation window, and for coaches, a listed venue if they have one.
6. **Review and go live:** a checklist of what's still missing, then `goLive()`.
- The same screens are reachable later from **Edit profile and packages** on every dashboard.
- Autosave drafts (`saveProfileDraft`), and warn before leaving with unsaved changes.

Done when: each operator type can finish setup and go live, `goLive` errors (missing items) show clearly in the checklist, and the live preview matches the real public profile.

---

## CC8 · Operator dashboards + remove mocks
**Wave 5 · parallel with CX8 · depends on CC7 and the real CX3/CX5 data**

Build in `(operator)/dashboard`, using `getDashboard(type)`:
- **Coach Home:** today's and upcoming sessions, attendance check-off, weekly schedule (edit availability), prices → edit packages.
- **Court Owner Home:** **today's courts at a glance**, a **Calendar** (day/week per court with bookings), **Add walk-in** (`addWalkIn`, which blocks the slot), bookings list, branch and court settings.
- **Gym Owner Home:** enquiries inbox (reply via `replyToEnquiry`), members list, plans, facilities and hours.
- **Academy Owner Home:** programs and enrolments, trial requests, parent enquiries inbox.
- Shared: notifications bell, **Edit profile and packages** (→ CC7), earnings summary (from the payouts ledger).
- **Finally: delete `apps/web/mocks/`** and make sure every screen in CC2–CC8 uses the real `lib/data` functions.

Done when: a booking made as an athlete appears on the right dashboard (coach + court shows on both), a walk-in removes that slot from the athlete's TimeSlotGrid, an enquiry reply reaches the athlete, no mock imports remain, and the CX8 e2e journeys pass against your screens.
