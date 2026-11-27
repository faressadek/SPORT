# Using Claude Code tools on SPORT

This is the Claude Code counterpart of `docs/codex-toolkit.md`. Keep it short: every enabled plugin uses context on every turn. Aim for 3–5.

## Enabled for this repo

`.claude/settings.json` lists these plugins under `enabledPlugins`. Claude Code offers to install them when it opens the repo. On claude.ai (web or cloud sessions), add them from the plugin catalog instead.

| Plugin | Why SPORT uses it | SPORT check it supports |
|---|---|---|
| `frontend-design` | Deliberate typography, colour and layout. It helps keep the app distinctive. | It works **with** the reference-repo rule in `AGENTS.md`, not in place of it. Still name the repo and pattern you borrowed. Take phone (390×844) and desktop (1280×860) screenshots before and after. |
| `superpowers` | Plan, test first, check before saying done. | Matches "run the tests for what you touched and record them in `docs/verification-log.md`". |
| `code-review` | Structured review of a PR or branch before merge. | Review every `claude/*` branch before the owner merges it. |
| `security-guidance` | Warns about injection, XSS and secrets while editing. | Backs the rules "public input is text, never HTML" and "prices come from the server". |

Install by hand in the Claude Code terminal:

```
/plugin install frontend-design@claude-plugins-official
/plugin install superpowers@claude-plugins-official
/plugin install code-review@claude-plugins-official
/plugin install security-guidance@claude-plugins-official
```

To turn one off for yourself only, set it to `false` in `.claude/settings.local.json`. That file is not committed.

## Already available, no install

| Tool | Use on SPORT |
|---|---|
| Playwright (Python) | `tests/ui/test_preview.py`, `tests/ui/smoke.py`, `tests/ui/live_e2e.py`. In Claude Code cloud sessions a Chromium is preinstalled at `/opt/pw-browsers/chromium`. If pip's Playwright version doesn't match it, launch with `executable_path` set to that path. |
| Postgres best practices skill | Schema, locks and constraints in `db/schema.sql` and `apps/api/src/pg-store.mjs`. |
| `/security-review` | Before any change to enquiries, payments or roles. |

## Not now, and when to add them

| Tool | Add when |
|---|---|
| shadcn MCP, react-best-practices, Vercel | The Next.js app from the handoff plan is scaffolded. Today the apps are plain HTML. |
| Supabase plugin/MCP | Supabase Auth is chosen for real sign-in. |
| Figma MCP | Designs exist in Figma. |
| Stripe MCP | Not planned. Payments are Paymob first, Kashier as fallback. |

The starter `CLAUDE.md` from the general toolkit (Next.js, Tailwind, pnpm) does **not** apply here. The project rules live in `AGENTS.md`, which ChatGPT, Gemini and Claude all share.
