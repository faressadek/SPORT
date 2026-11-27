# SPORT verification log

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
