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
- `apps/athlete-preview/index.html`: standalone athlete preview. No build step.
- `tests/ui/test_preview.py`: browser checks. Run `python tests/ui/test_preview.py apps/athlete-preview/index.html shots`.
- `docs/`: handoff, decisions, verification log.

## How to work so the other agents can follow
- Work on a branch named after your tool: `chatgpt/<topic>`, `gemini/<topic>` or `claude/<topic>`. Open a pull request. Don't push straight to `main` unless the owner says so.
- Before you finish, run the UI checks if you touched the preview, and record the results in `docs/verification-log.md`.
- Add one dated line to the "Activity" list at the bottom of `docs/decisions.md`: tool, what changed, what is open.
- Write a new owner decision into `docs/decisions.md` as soon as it's made.
- Keep the same names everywhere: Courts, Coaches, Gyms, Academies, EGP, Cairo time.
