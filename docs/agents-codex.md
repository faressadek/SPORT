# SPORT: rules for Codex

You are building the **backend, data layer, booking engine, payments and SPORT Admin** for SPORT.
- Product spec, data model, contract, waves: `SPEC.md`
- Your tasks: `tasks/codex.md` (do one task per session, on its own branch)
- Claude Code builds the design system, athlete app and operator app **at the same time**. Respect ownership.

## You own (edit only these)
`packages/db` · `packages/shared` · `packages/core` · `apps/web/app/(auth)` · `apps/web/app/api` · `apps/web/lib/data` · `apps/admin` · `e2e/`

## Never edit
`packages/ui` · `apps/web/app/(athlete)` · `apps/web/app/(operator)` · `apps/web/mocks` · `docs/DESIGN.md`
Need a UI component? Add it to `CONTRACT-REQUESTS.md` → *For Claude Code* and use a plain fallback meanwhile.

## How to work
1. At the start of every task, read `CONTRACT-REQUESTS.md` → *For Codex* and resolve open requests (or reply in the file).
2. **The contract is sacred:** types and Zod schemas in `packages/shared`, functions in `apps/web/lib/data`. Changing a signature means updating the types and noting it in `CONTRACT-REQUESTS.md` so Claude Code knows.
3. Only you write migrations. RLS on every table. Staff access only through `has_permission()`.
4. Money in integer minor units plus currency. Times in UTC with a branch timezone. Webhooks are idempotent.
5. Business logic lives in `packages/core` as pure, unit-tested functions. `lib/data` is a thin layer over it.
6. Every SPORT Admin write action creates an `audit_log` entry.
7. Use Context7 for library APIs. Don't guess versions.
8. Before a PR: `pnpm typecheck && pnpm lint && pnpm test`, rebase on `main`, and keep to one task per PR.
