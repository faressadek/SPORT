# SPORT verification log — 27 Nov 2026

**File tested:** `apps/athlete-preview/index.html` (football build: home, sports grid, clubs/branches, availability grid, pitch listings, coaches).
**How:** Google Chrome (Playwright), Africa/Cairo time zone, phone 390×844 and desktop 1280×860. 33 checks per size. The script is `test_preview.py`.

## Result

| Run | Passed |
|---|---|
| Original file | 62 / 66 |
| Fixed file | **66 / 66** |

## Checks covered (both sizes)

- Home renders with no sideways scrolling on phone.
- Sports grid shows nine sports. Football shows three clubs, and branch search narrows them (e.g. "sidi" → Eastside).
- Tapping a slot on a club card opens that branch's grid with the slot highlighted.
- Facility booking: the review opens, the booking confirms, and the booked cell becomes unavailable.
- **My bookings → Cancel frees the facility slot again.** *(failed before the fix)*
- Pitch listing (`#/courts`): three pitches. A quick-time chip opens the detail with the time preselected.
- Review focus: the review title gets focus when the review opens, and focus returns to "Review booking" after Escape.
- Coach picker: nine sports. Football shows two coaches.
- Fixed-venue coach (Nour Amin): shows "Smouha training ground" and has no court add-on.
- Flexible coach (Omar Adel): shows the add-on. Adding a pitch shows the pitch list and itemized prices (400 + 500 = 900 EGP).
- Omar + East Ground shows "No shared times on this date."
- Padel coach: booking is blocked until a training location is entered, then allowed.
- Facility review dialog has an accessible name. *(failed before the fix)*
- No JavaScript errors.

## Fixes made

1. **Cancelled facility booking stayed blocked.** Closing My bookings now redraws the facility grid as well as the pitch listings.
2. **Facility review dialog.** It was an unstyled browser default with no label. It now reuses the review sheet from the pitch and coach flow (Vaul pattern): a bottom sheet on phone and a centered dialog on desktop. It is labelled, focuses its title, returns focus to the cell you tapped, and says "No payment was taken."
3. **Desktop detail alignment.** The detail layout and "Back to results" now share the 820 px column with the header.

## Still open

- **Backend:** `node --test http.test.mjs` and the PostgreSQL suite (`node test.mjs --http`) were **not run**. The prototype files were not available to this session.
- **Two pitch inventories:** "Book a court" goes to clubs (Coastal/Eastside/City) with their own prices. The home "Football pitches in Alexandria" row and "Saved football pitches" go to a separate list (North Pitch/Seafront/East Ground). A coach's "Add a pitch" also draws from the second list. These need to become one product decision.
- **Two colour systems:** home and facility screens are blue. Booking detail and coach screens are dark green and lime.
- **Minor:** Padel, Tennis and Squash share the 🎾 icon. The home search placeholder is cut off on phone ("neighb…"). The pitch detail uses wrapping date pills while listings use the week strip.
- Keyboard-only walk-through and screen-reader pass were not done beyond the focus checks above.
