# SPORT decisions

Newest first. Only the owner makes decisions. Agents record them here.

| Date | Decision |
|---|---|
| 2026-11-28 | Open on the athlete home. A bottom operator link leads to four distinct operator workspaces: coach, court owner, academy owner and gym owner. |
| 2026-11-28 | **One pitch inventory: clubs and branches** (`#/sports/football`, Coastal/Eastside/City) are the only pitch source, including for a coach's "Add a pitch". The separate North Pitch/Seafront/East Ground list goes away. |
| 2026-11-28 | **Colour system: dark green and lime** across the whole app. Home and facility screens move off blue. |
| 2026-11-27 | GitHub repo `faressadek/SPORT` is the single shared home for ChatGPT, Gemini and Claude. `AGENTS.md` holds the shared rules. |
| 2026-11 | Courts and Coaches are separate pages. A court add-on appears only for a coach with no listed location. |
| 2026-11 | UX is built by combining patterns from the cloned reference repos, each one named. |
| 2026-11 | Academy discovery is in the pilot (search plus direct enquiry). |
| 2026-11 | Pilot: Alexandria, mobile-friendly web first. |

## Open questions for the owner
- Cancellation window, fees and refund rules before live checkout.

## Activity
- 2026-11-28 · Claude: provider schedules (weekly hours, closures) in API, PostgreSQL, portal and athlete app. Open: athlete notifications for closures, real sign-in, Paymob sandbox.
- 2026-11-28 · Claude: applied the pitch-inventory and colour decisions (club branches everywhere, dark green and lime). Open: real sign-in, Paymob sandbox, provider schedules.
- 2026-11-28 · Claude: added `docs/claude-toolkit.md` and `.claude/settings.json` (plugins: frontend-design, superpowers, code-review, security-guidance). Reviewed the gyms/academies branch and fixed 5 findings.
- 2026-11-28 · Claude: gyms and academies now live in the shared catalog and in PostgreSQL. New public search routes (`GET /api/gyms`, `GET /api/academies`), admin moderation (`PATCH /api/admin/listings/:id`), and enquiries must target a real, published listing. The athlete app loads listings from the API; the portal shows listings per owner. Recorded the pitch-inventory and colour decisions. Open: apply those two decisions in the app, real sign-in, Paymob sandbox, provider schedules.
- 2026-11-28 · Claude: connected the API to PostgreSQL (bookings now survive restarts). Every API test runs on both stores. Fixed a deadlock under contention and a crash when two servers start together. Open: real sign-in, Paymob sandbox, gyms/academies data in the database.
- 2026-11-27 · Claude: reviewed the SPORT-full-stack bundle and fixed 15 defects (see verification log). Added API edge-case, PostgreSQL and live end-to-end tests, plus CI. Open: the API still keeps data in memory, not PostgreSQL.
- 2026-11-27 · Claude: added the athlete preview, UI checks and verification log. Set up shared agent instructions. Open: the backend prototype is not in the repo yet.

- 2026-11-28 · ChatGPT: added the athlete-to-operator entry and role-specific workspace pages. Production identity remains open.
