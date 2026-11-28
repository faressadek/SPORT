# SPORT

Egyptian sports marketplace for athletes and parents: book courts, find coaches, compare gyms, and search academies. The pilot is a mobile-friendly web app in Alexandria, in English and Arabic.

## What's here

| Path | What it is |
|---|---|
| `apps/athlete-preview/index.html` | Athlete app: Courts, Coaches (with the court add-on for coaches without a venue), Gyms, Academies, My bookings, English/Arabic. Works offline with sample data, or against the API. |
| `apps/provider/index.html` | Provider app: role picker, then a workspace for each role: Coach, Courts & venue, Gym, Academy. Needs the API. |
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

## Next.js workspace

Use Node.js 22 or newer and pnpm 10.28.2. Corepack can activate the version pinned in `package.json`.

```sh
corepack enable
pnpm install
pnpm dev
```

- [SPORT](http://127.0.0.1:3000) runs from `apps/web`.
- [SPORT Admin](http://127.0.0.1:3001) runs from `apps/admin`.
- `pnpm build`, `pnpm typecheck`, `pnpm lint` and `pnpm test` run from the repository root.

The two routes are starter pages. For work that needs the local Supabase stack, start Docker and run:

```sh
pnpm --filter @sport/db exec supabase start
pnpm --filter @sport/db exec supabase status
```

Copy each app's `.env.example` to `.env.local` and use the local URL and publishable key from the status output. See [SPEC.md](SPEC.md) for the product plan and [tasks/codex.md](tasks/codex.md) for the implementation sequence. The CLI configuration lives in `packages/db/supabase`.

The original prototype is available below. Stop the Next.js dev server before starting the prototype API on port 3000, or set `PORT` when starting the API.

## Run the prototype

```sh
pnpm install
pnpm run start:api                      # API on http://127.0.0.1:3000, in-memory (data lost on restart)
# or, with PostgreSQL: cp .env.example .env, edit DATABASE_URL, then
pnpm run start:api:db                   # creates the schema on first start and keeps data
# open apps/athlete-preview/index.html  → header shows "API connected"
# open apps/provider-admin/index.html
```

## Test the prototype

```sh
pnpm run test:prototype                                # API checks on the in-memory store; PostgreSQL runs skip without DATABASE_URL
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/postgres pnpm run test:prototype   # every API test also on PostgreSQL (needs psql)
pip install playwright pytest && python -m playwright install chromium
python -m pytest tests/ui/test_preview.py
python tests/ui/smoke.py apps/athlete-preview/index.html shots
python tests/ui/live_e2e.py . http://127.0.0.1:3000   # with the API running
```

All venues, coaches, prices and availability are sample data. No real bookings or payments are made.
