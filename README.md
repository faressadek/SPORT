# SPORT

Egyptian sports marketplace for athletes and parents: book courts, find coaches, compare gyms, and search academies. The pilot is a mobile-friendly web app in Alexandria.

## What's here

| Path | What it is |
|---|---|
| `apps/athlete-preview/index.html` | Standalone athlete preview with sample data: home, sports, clubs and branches, availability grid, pitch listings, and coaches. Open it in a browser. |
| `tests/ui/test_preview.py` | Browser checks for the preview at phone and desktop sizes. |
| `docs/handoff.md` | Project handoff: vision, decisions, architecture, and next steps. |
| `docs/verification-log.md` | What has been tested, what passed, and what is still open. |

## Booking rules

- **Courts:** book a court on its own.
- **Coaches:** see where the coach trains. A coach with a listed venue is booked at that venue.
- **Add a court:** offered only when the coach has no listed training location. The athlete adds a court (shared times only, itemized prices) or enters a location they arranged.
- **Gyms and academies:** separate discovery journeys.

## Run the UI checks

```sh
pip install playwright && python -m playwright install chromium
python tests/ui/test_preview.py apps/athlete-preview/index.html shots
```

The preview uses sample venues, prices, and availability. It is not connected to a backend, and no payments are taken.

## Not yet in this repo

The booking engine prototype (PostgreSQL schema, Node server, tests, and CI workflow) and the SRS, booking spec, and work plan from the handoff bundle.
