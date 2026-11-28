# SPORT

Egyptian sports marketplace for athletes and parents: book courts, find coaches, compare gyms, and search academies. The pilot is a mobile-friendly web app in Alexandria, in English and Arabic.

## What's here

| Path | What it is |
|---|---|
| `apps/athlete-preview/index.html` | Athlete app: Courts, Coaches (with the court add-on for coaches without a venue), Gyms, Academies, My bookings, English/Arabic. Works offline with sample data, or against the API. |
| `apps/provider-admin/index.html` | Provider and admin portal: bookings, opening hours and closures, gym and academy listings (admins can hide or publish them), enquiries, refund queue. |
| `apps/api/src/server.mjs` | Booking API (Node 22). Uses PostgreSQL when `DATABASE_URL` is set, otherwise an in-memory store for demos. |
| `apps/api/src/pg-store.mjs`, `memory-store.mjs` | The two stores. Same interface, same tests. |
| `apps/api/src/rules.mjs`, `catalog.mjs` | Booking rules and the sample catalog, shared by both stores. |
| `apps/api/src/access.mjs` | Role rules for athletes, providers and admins. |
| `db/schema.sql` | PostgreSQL schema. Overlap protection, half-open time ranges, payment attempts, outbox, gyms and academies. |
| `tests/api/` | API checks: booking flows, late or duplicate payments, validation, the add-on rule, enquiry privacy, gym and academy search and moderation. |
| `tests/db/` | Loads the schema into PostgreSQL and races two bookings for the same coach. |
| `tests/ui/` | Browser checks: `test_preview.py` (pytest), `smoke.py` (all routes, phone and desktop), `live_e2e.py` (app and portal against the API). |
| `AGENTS.md` | Shared rules for ChatGPT/Codex, Gemini and Claude. |
| `docs/` | Handoff, owner decisions, verification log. |

## Run it

```sh
npm install
npm run start:api                      # API on http://127.0.0.1:3000, in-memory (data lost on restart)
# or, with PostgreSQL: cp .env.example .env, edit DATABASE_URL, then
npm run start:api:db                   # creates the schema on first start and keeps data
# open apps/athlete-preview/index.html  → header shows "API connected"
# open apps/provider-admin/index.html
```

## Test it

```sh
npm test                                # API checks on the in-memory store; PostgreSQL runs skip without DATABASE_URL
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres npm test   # every API test also on PostgreSQL (needs psql)
pip install playwright pytest && python -m playwright install chromium
python -m pytest tests/ui/test_preview.py
python tests/ui/smoke.py apps/athlete-preview/index.html shots
python tests/ui/live_e2e.py . http://127.0.0.1:3000   # with the API running
```

All venues, coaches, prices and availability are sample data. No real bookings or payments are made.
