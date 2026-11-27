# SPORT — instructions for every AI agent

This file is shared by ChatGPT/Codex, Gemini and Claude. Keep project rules here, not in one tool's chat. If a chat and this file disagree, this file and `docs/decisions.md` win. Raise the conflict with the owner (Fares).

## Read first
1. `docs/decisions.md`: the owner's decisions, newest first.
2. `docs/handoff.md`: vision, architecture and history.
3. `docs/verification-log.md`: what has been tested and what is still open.

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
- `apps/api/src/`: booking API (in-memory store for now). `db/schema.sql`: PostgreSQL schema.
- Tests: `npm test` (API; DB with `DATABASE_URL`), `python -m pytest tests/ui/test_preview.py`, `python tests/ui/smoke.py apps/athlete-preview/index.html shots`, `python tests/ui/live_e2e.py . http://127.0.0.1:3000`.
- `docs/`: handoff, decisions, verification log.

## Booking-engine rules the code must keep
- One active allocation per resource per time range (PostgreSQL exclusion constraint). Ranges are half-open `[start, end)`.
- A hold reserves every resource or none.
- Every payment that cannot confirm a booking records exactly one refund request. A newer booking is never disturbed.
- Prices come from the server, never from the client.
- Anything a member of the public submits is shown as text, never as HTML.

## How to work so the other agents can follow
- Work on a branch named after your tool: `chatgpt/<topic>`, `gemini/<topic>` or `claude/<topic>`. Open a pull request. Don't push straight to `main` unless the owner says so.
- Before you finish, run the tests for what you touched, and record the results in `docs/verification-log.md`.
- Add one dated line to the "Activity" list at the bottom of `docs/decisions.md`: tool, what changed, what is open.
- Write a new owner decision into `docs/decisions.md` as soon as it's made.
- Keep the same names everywhere: Courts, Coaches, Gyms, Academies, EGP, Cairo time.
