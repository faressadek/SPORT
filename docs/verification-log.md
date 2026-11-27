# SPORT verification log

## 28 Nov 2026 · Claude · API connected to PostgreSQL (branch `claude/postgres-store`)

The API now keeps its data in PostgreSQL when `DATABASE_URL` is set. Without it, it uses the in-memory store for demos. Both stores share one interface, the booking rules (`rules.mjs`) and the sample catalog (`catalog.mjs`). Every API test runs against both.

### Results (PostgreSQL 16, Node 22)

| Check | Result |
|---|---|
| `npm test` with `DATABASE_URL`: API tests on both stores plus schema tests | **45 / 45**, stable across 6 repeated runs |
| `npm test` without a database | 19 / 19 (memory); PostgreSQL runs skip |
| App and portal against the API on PostgreSQL (`tests/ui/live_e2e.py`) | **13 / 13** |
| API restarted: bookings and enquiries still there | passed (before: everything lost) |
| Two API servers on one database, 320 requests racing for one coach (8 rounds × 40) | exactly 1 booking per hour, 319 clean "taken" replies, **0 errors** |
| PostgreSQL restarted under a running API | API stayed up and kept answering |

New automated tests: late capture that still fits (confirms), bookings list/availability/cancel, server-side facility prices and owner visibility, admin unpublish, 12-way race for one court, 5 simultaneous duplicate captures (one confirmation, no refund), Cairo-hour mapping and back-to-back hours, and the two-server race (PostgreSQL only).

### Problems found and fixed while connecting the database
1. **Deadlocks under contention.** When two bookings collide at the same instant, PostgreSQL's overlap check can make each transaction wait for the other. In the first two-server race, 8 of 20 requests failed with a server error. Fixed: bookings for the same resource and hour now queue behind a short transaction lock, allocations are inserted in a fixed order, and a deadlock is retried. The overlap constraint is still the final guard.
2. **Two servers starting together crashed one of them** (both tried to create the schema). Fixed with a database lock around setup.
3. **A dropped database connection would crash the API.** Fixed with a connection-error handler. PostgreSQL restart tested.
4. Labels and resource order now match between stores (court first, then coach).

### How the database decides
- A hold is one transaction: queue on the slot, expire due holds, insert the booking and one allocation per resource. An overlap anywhere rolls the whole hold back (409).
- A payment capture locks the booking row, then checks the idempotency key. A late capture tries to re-reserve the slot: it confirms if the slot is free, and otherwise records one refund while the newer booking stays.
- Expired holds are released on every request and by a background sweep every 30 s.

### Still open
- Sign-in is still demo tokens (user IDs). Production authentication is next.
- Gym and academy listings live in the athlete app, not yet in the database (`directory_listings` exists).
- Paymob/Kashier sandbox: checkout expiry, signed callbacks, refunds, reconciliation.
- Provider schedules and closures. Opening hours are still fixed lists in `catalog.mjs`.
- CI has not run on GitHub yet.

---

## 27 Nov 2026 (evening) · Claude · review of the `SPORT-full-stack` bundle

The bundle added an API, a PostgreSQL schema, a provider/admin portal, Gyms and Academies, and Arabic (RTL) to the athlete app.

### Results

| Check | Bundle as received | After fixes |
|---|---|---|
| Bundle's own API tests (3) | 3 / 3 | 3 / 3 |
| Edge-case API tests (9, `tests/api/edge-cases.test.mjs`) | 1 / 9 | 9 / 9 |
| PostgreSQL schema tests (`tests/db`, PostgreSQL 16) | not run by the bundle | 6 / 6 |
| Every route at phone and desktop sizes (`tests/ui/smoke.py`) | Gyms and Academies don't open; JS error on every page | All routes open, no JS errors, no sideways scroll, RTL works |
| App and portal against the live API (`tests/ui/live_e2e.py`, 13) | stops at Gyms | 13 / 13 |
| `tests/ui/test_preview.py` (pytest) | — | passes |

### Defects found and fixed

**Booking API**
1. A second late payment confirmed an expired booking on top of the new holder, so two athletes ended up booked on the same pitch and hour.
2. Paying for a cancelled booking brought it back as confirmed.
3. A duplicate payment on a confirmed booking was accepted with no refund. Every extra payment now records one refund request.
4. Any resource ID was accepted and priced at 500 EGP. So were unpublished resources and hours outside the listed times. Facility pitches (`football/coastal/0/1` and similar) were unknown to the API, which charged a flat 500 EGP. The API now prices them with the same formula as the app.
5. A court could be added to a coach who has a listed venue, which breaks the owner rule.
6. Every provider could read all gym and academy enquiries, including parents' phone numbers. Now only admins and the listing owner can.
7. An idempotency key could replay another booking's payment result. Keys are now scoped to the booking, and ownership is checked first.
8. Malformed JSON returned 500. It now returns 400.
9. The server would not start on Windows (`file://` check). It now uses `pathToFileURL`.

**Athlete app**
10. Gyms and Academies crashed the router and showed the football coach list instead. The same crash ran on every page load.
11. In live mode, reconnecting replaced My bookings with unlabelled server records. Labels are now kept, and server-only bookings get labels from the API.
12. Lost from the earlier fixed preview, now restored: the facility review is labelled and returns focus to the tapped cell, and cancelling in My bookings frees the slot without a reload.
13. The facility heading read "Find a Football". It now reads "Find a pitch" or "Find a court". Errors show in the review instead of a browser alert.

**Provider/admin portal**
14. Enquiry names and phones were written into the page as HTML. A name containing a script ran in the admin's browser. Everything is now escaped.

**Schema seed**
15. Football courts had no owner, and the `venue-coastal` operator the API uses was missing.

### Still open
- **The API does not use PostgreSQL yet.** It keeps data in memory (lost on restart). The schema is verified, but the API needs a PostgreSQL store with the same rules, a background job that expires holds, and an API-to-database test.
- Demo sign-in: tokens are user IDs (`demo-athlete-marwan`). Production authentication is not built.
- Payments are simulated. Paymob/Kashier sandbox checks are still to do.
- Page titles stay "Athlete home | SPORT" on every route.
- Owner questions in `docs/decisions.md`: one pitch inventory, and the colour system.
- GitHub CI (`.github/workflows/ci.yml`) has not run yet. It runs the API, PostgreSQL and browser checks on every push.

---

## 27 Nov 2026 · Claude · football preview

**File tested:** `apps/athlete-preview/index.html`, football build.
**How:** Chrome (Playwright), Africa/Cairo time, phone 390×844 and desktop 1280×860, 33 checks per size.

- Original 62 / 66, fixed **66 / 66**.
- Fixed: a cancelled facility booking stayed blocked; the facility review dialog was unstyled with no accessible name; the desktop detail layout was misaligned.
- Covered: home, sports grid, club search, slot hint, facility booking and cancel, pitch listing, review focus and Escape, fixed vs flexible coach, itemized 900 EGP total, "No shared times", padel coach location rule.
