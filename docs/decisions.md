# SPORT decisions

Newest first. Only the owner makes decisions. Agents record them here.

| Date | Decision |
|---|---|
| 2026-11-28 | **Adopt the SPORT build kit** (`SPEC.md`: Turborepo + pnpm, Next.js, Supabase, Claude Code/Codex split) **alongside** the preview apps. The previews stay until the new apps replace them. |
| 2026-11-28 | **Languages: English + Arabic with right-to-left layout** (SPEC open decision 4). The design system supports RTL from day one. |
| 2026-11-28 | Claude Code scaffolds the minimal workspace (`apps/web`, `packages/ui`, `packages/eslint-config`) so CC1 can start; Codex finishes CX0 (`apps/admin`, `packages/db`, `packages/shared`, `packages/core`, Supabase init). |
| 2026-11-28 | **Entry flow:** the app opens on the athlete side. At the bottom of home, "Are you a coach, venue, gym or academy?" leads to a role picker (Coach, Courts/venue, Gym, Academy). Each role opens its own workspace and landing screen. See `docs/architecture.md`. |
| 2026-11-28 | **Visual direction: Pitch-side.** Scoreboard-style condensed type, chalk pitch lines on deep green, lime only for actions and selections. |
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
- 2026-11-28 · Claude: provider app with a mini app per role (coach, venue, gym, academy) and the API behind it. The first demo (venue walk-in blocks the athlete) passes. Open: Arabic for the provider app, real sign-in.
- 2026-11-28 · Claude: wrote `docs/architecture.md` (target architecture, entry flow, workspace per role, build order).
- 2026-11-28 · Claude: Pitch-side redesign of the athlete app. Open: portal not restyled beyond colours; review on a real phone.
- 2026-11-28 · Claude: provider schedules (weekly hours, closures) in API, PostgreSQL, portal and athlete app. Open: athlete notifications for closures, real sign-in, Paymob sandbox.
- 2026-11-28 · Claude: applied the pitch-inventory and colour decisions (club branches everywhere, dark green and lime). Open: real sign-in, Paymob sandbox, provider schedules.
- 2026-11-28 · Claude: added `docs/claude-toolkit.md` and `.claude/settings.json` (plugins: frontend-design, superpowers, code-review, security-guidance). Reviewed the gyms/academies branch and fixed 5 findings.
- 2026-11-28 · Claude: gyms and academies now live in the shared catalog and in PostgreSQL. New public search routes (`GET /api/gyms`, `GET /api/academies`), admin moderation (`PATCH /api/admin/listings/:id`), and enquiries must target a real, published listing. The athlete app loads listings from the API; the portal shows listings per owner. Recorded the pitch-inventory and colour decisions. Open: apply those two decisions in the app, real sign-in, Paymob sandbox, provider schedules.
- 2026-11-28 · Claude: connected the API to PostgreSQL (bookings now survive restarts). Every API test runs on both stores. Fixed a deadlock under contention and a crash when two servers start together. Open: real sign-in, Paymob sandbox, gyms/academies data in the database.
- 2026-11-27 · Claude: reviewed the SPORT-full-stack bundle and fixed 15 defects (see verification log). Added API edge-case, PostgreSQL and live end-to-end tests, plus CI. Open: the API still keeps data in memory, not PostgreSQL.
- 2026-11-27 · Claude: added the athlete preview, UI checks and verification log. Set up shared agent instructions. Open: the backend prototype is not in the repo yet.

- 2026-11-28 · ChatGPT: added the athlete-to-operator entry and role-specific workspace pages. Production identity remains open.
- 2026-11-28 · Claude: merged main (ChatGPT's operator entry) into the provider-app branch. Athlete home keeps one operator link, to `apps/provider` (#/join). `provider-admin/operators.html` now redirects there; the admin portal's `?workspace=` views stay. Open: Arabic in the provider app.
- 2026-11-28 · Claude: CC1 design system and app shells. Copied the build kit (SPEC.md, tasks, CONTRACT-REQUESTS.md, flow diagrams) into the repo, scaffolded the pnpm/Turborepo workspace, wrote `docs/DESIGN.md`, built 22 components and the athlete, operator and admin shells in `packages/ui`, and a `/dev/ui` page. Open: Codex to finish CX0; open SPEC decisions 1–3 and 5.
- 2026-11-28 · Codex: scaffolded the SPORT and SPORT Admin monorepo and initialized the local Supabase project. Open: CX0 merge and CX1 schema and data contract.

- 2026-11-28 · Codex: reconciled CC1 with the merged CX0 scaffold and verified both apps. Open: CX1 schema and data contract.
- 2026-11-28 · Claude: acted on the Codex audit of `main`: one UI stylesheet, root TypeScript and ESLint for web and UI, removed the broken `tokens` export, one workspace CI job, README test commands. Open: CX1.

- 2026-11-28 · Codex: implemented CX1 Supabase migrations, seed, RLS tests, generated types, and the typed data contract. Open: CX1 merge before dependent work.
