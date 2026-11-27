# SPORT decisions

Newest first. Only the owner makes decisions. Agents record them here.

| Date | Decision |
|---|---|
| 2026-11-27 | GitHub repo `faressadek/SPORT` is the single shared home for ChatGPT, Gemini and Claude. `AGENTS.md` holds the shared rules. |
| 2026-11 | Courts and Coaches are separate pages. A court add-on appears only for a coach with no listed location. |
| 2026-11 | UX is built by combining patterns from the cloned reference repos, each one named. |
| 2026-11 | Academy discovery is in the pilot (search plus direct enquiry). |
| 2026-11 | Pilot: Alexandria, mobile-friendly web first. |

## Open questions for the owner
- One pitch inventory? Should clubs and branches (`#/sports/football`) be the single source, including for a coach's "Add a pitch"? Or keep the separate pitch list?
- Colour system: keep blue (home and facilities) or dark green and lime (booking and coaches)?
- Cancellation window, fees and refund rules before live checkout.

## Activity
- 2026-11-27 · Claude: reviewed the SPORT-full-stack bundle and fixed 15 defects (see verification log). Added API edge-case, PostgreSQL and live end-to-end tests, plus CI. Open: the API still keeps data in memory, not PostgreSQL.
- 2026-11-27 · Claude: added the athlete preview, UI checks and verification log. Set up shared agent instructions. Open: the backend prototype is not in the repo yet.
