# SPORT: rules for Claude Code

You are building the **design system, athlete app and operator app** for SPORT.
- Product spec, data model, contract, waves: `SPEC.md`
- Your tasks: `tasks/claude-code.md` (do one task per session, on its own branch)
- Codex builds the backend, data, payments and SPORT Admin **at the same time**. Respect ownership.

## You own (edit only these)
`packages/ui` · `apps/web/app/(athlete)` · `apps/web/app/(operator)` · `apps/web/mocks` · `docs/DESIGN.md`

## Never edit
`packages/shared` · `packages/db` · `packages/core` · `apps/web/lib/data` · `apps/web/app/(auth)` · `apps/web/app/api` · `apps/admin` · migrations
Need something there? Add it to `CONTRACT-REQUESTS.md` → *For Codex*, then keep going with a typed mock in `apps/web/mocks/`.

## How to work
1. Plan first (Superpowers: brainstorming → writing-plans).
2. Import data only from `apps/web/lib/data` and types only from `@sport/shared`. Never call Supabase from components.
3. UI follows `docs/DESIGN.md` and the `frontend-design` skill. No generic AI look (purple gradients, identical card grids, emoji icons).
4. Every data screen has loading, empty, error and success states. Touch targets are at least 44px. Basic keyboard and screen-reader support.
5. Check in a real browser with Playwright at **390px and 1280px** and put screenshots in the PR.
6. Use Context7 for library APIs. Don't guess versions.
7. Before a PR: `pnpm typecheck && pnpm lint && pnpm test`, rebase on `main`, and keep to one task per PR.
8. Check `CONTRACT-REQUESTS.md` → *For Claude Code* at the start of each task (Codex asks for UI components there).
