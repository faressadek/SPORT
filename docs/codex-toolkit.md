# Using the Codex toolkit on SPORT

The full-stack implementation is under review in PR #1. Run these checks on a branch that contains that implementation.

| Change | Upstream guide | SPORT verification |
| --- | --- | --- |
| Athlete booking UI | anthropics/skills, webapp-testing | Run `python -m pytest tests/ui/test_preview.py`. Exercise Courts and Coaches at phone and desktop widths. Check that a coach with a fixed venue has no court add-on. For a flexible coach, check shared availability and the itemized total. |
| Resource allocation | supabase/agent-skills, Postgres best practices | Run `npm test` with a disposable PostgreSQL server and `DATABASE_URL`. Verify that the database tests ran and that a conflicting coach hold releases the entire losing transaction. |
| API and UI integration | obra/superpowers, verification-before-completion | Run the branch's live browser test against its API. Identify the commit, test command, and outcome. Distinguish simulated booking success from database persistence. |

The source bundle is a reference snapshot. Its top-level `REVISIONS.txt` identifies each upstream commit. Individual projects retain their own licenses and setup instructions. Plugin installation and account connections are managed separately in Codex.
