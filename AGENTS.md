# SPORT — instructions for every AI agent

This file is shared by ChatGPT/Codex, Gemini and Claude. Keep project rules here, not in one tool's chat. If a chat and this file disagree, this file and `docs/decisions.md` win. Raise the conflict with the owner (Fares).

## Read first
1. `docs/decisions.md`: the owner's decisions, newest first.
2. `docs/architecture.md`: target architecture, entry flow and what each role's workspace does.
3. `docs/handoff.md`: vision and history.
4. `docs/verification-log.md`: what has been tested and what is still open.

## Product rules (owner decisions)
- SPORT is an Egyptian sports marketplace. The pilot is a mobile-friendly web app in Alexandria.
- **Courts** and **Coaches** are separate booking pages.
- A coach with a listed venue is booked at that venue.
- "Add a court" appears only when the coach has no listed training location. It shows shared times only, itemized prices and a total, and reserves both together.
- Gyms and academies are separate discovery journeys.
- UI work starts from the cloned reference repos listed in `docs/handoff.md`. Name the repo and pattern you borrowed and say why it fits. Don't add decoration for its own sake.
- All data is sample data. Never present the preview as taking real bookings or payments.

## Repo layout
- `apps/athlete-preview/index.html`: athlete app. No build step. Runs offline or against the API with `?api=http://127.0.0.1:3000`.
- `apps/provider-admin/index.html`: provider/admin portal.
- `apps/api/src/`: booking API. `pg-store.mjs` (PostgreSQL, used when `DATABASE_URL` is set) and `memory-store.mjs` implement one interface. Put booking rules in `rules.mjs` and sample data in `catalog.mjs`, never in one store only. `db/schema.sql`: PostgreSQL schema.
- Tests: `npm test` (every API test runs on both stores when `DATABASE_URL` is set), `python -m pytest tests/ui/test_preview.py`, `python tests/ui/smoke.py apps/athlete-preview/index.html shots`, `python tests/ui/live_e2e.py . http://127.0.0.1:3000`.
- `docs/`: handoff, decisions, verification log. Tool guides: `docs/codex-toolkit.md` (Codex), `docs/claude-toolkit.md` (Claude Code; plugins are listed in `.claude/settings.json`).

## New stack: the SPORT build kit (owner decision, 2026-11-28)
The production apps are being built from `SPEC.md` (product, data model, contract, waves) alongside the preview apps above, which stay until the new apps replace them.
- Turborepo + pnpm workspace: `apps/web` (SPORT, Next.js), `apps/admin` (SPORT Admin), `packages/ui`, `packages/shared`, `packages/db`, `packages/core`. One ESLint config at the root (`eslint.config.mjs`).
- Ownership (SPEC §3, §7.3): Claude Code owns `packages/ui`, `apps/web/app/(athlete)`, `apps/web/app/(operator)`, `apps/web/mocks`, `docs/DESIGN.md`. Codex owns `packages/db`, `packages/shared`, `packages/core`, `apps/web/app/(auth)`, `apps/web/app/api`, `apps/web/lib/data`, `apps/admin`, `e2e/`. Ask for anything outside your folders in `CONTRACT-REQUESTS.md`.
- Tasks: `tasks/claude-code.md`, `tasks/codex.md`. Per-tool rules from the kit: `docs/agents-claude-code.md`, `docs/agents-codex.md`.
- UI follows `docs/DESIGN.md`. Check UI with `node packages/ui/scripts/check-pages.mjs <base-url> <out-dir>` (axe, 390px and 1280px, light, dark, RTL).
- Before a PR: `pnpm typecheck && pnpm lint && pnpm test` (`pnpm test` runs the preview API tests and the workspace tests).

## Booking-engine rules the code must keep
- One active allocation per resource per time range (PostgreSQL exclusion constraint). Ranges are half-open `[start, end)`.
- A hold reserves every resource or none.
- Every payment that cannot confirm a booking records exactly one refund request. A newer booking is never disturbed.
- Prices come from the server, never from the client.
- Anything a member of the public submits is shown as text, never as HTML.
- In PostgreSQL, take the per-slot advisory locks (`lockSlots`) before inserting or reactivating allocations. Retry deadlocks and serialization failures (`40P01`, `40001`).
- More than one API server may run against the same database. Don't keep booking state in process memory.

## How to work so the other agents can follow
- Work on a branch named after your tool: `chatgpt/<topic>`, `gemini/<topic>` or `claude/<topic>`. Open a pull request. Don't push straight to `main` unless the owner says so.
- Before you finish, run the tests for what you touched, and record the results in `docs/verification-log.md`.
- Add one dated line to the "Activity" list at the bottom of `docs/decisions.md`: tool, what changed, what is open.
- Write a new owner decision into `docs/decisions.md` as soon as it's made.
- Keep the same names everywhere: Courts, Coaches, Gyms, Academies, EGP, Cairo time.
