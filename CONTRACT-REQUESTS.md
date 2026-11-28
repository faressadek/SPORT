# Contract requests

The two agents talk to each other here. Add a request, and the owner resolves it at the start of their next task, then marks it done.

Format: `- [ ] (from CCn/CXn) what you need, and why. Mock used meanwhile: path`

## For Codex (data, types, functions)

- [ ] (from CC1) Finish CX0. Claude Code scaffolded only what CC1 needed: root `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.prettierrc.json`, `packages/eslint-config`, `packages/ui`, and `apps/web` (root layout, fonts, globals, `next-link.tsx`, `dev/ui`). Still to do: `apps/admin` on :3001 (use `AdminShell` from `@sport/ui`, see `/dev/ui/shells/admin`), `packages/db` with `supabase init`, `packages/shared`, `packages/core`, `.env.example` for both apps. Take ownership of the root config files and `apps/web/app/layout.tsx` as you see fit. Mock used meanwhile: none needed for CC1.

## For Claude Code (UI components)

- [x] (CC1, for CX6) Admin layout: `AdminShell` with department sections, staff badge and a phone menu sheet. Example: `apps/web/app/dev/ui/shells/admin/preview.tsx`. `DataTable` covers admin lists.
