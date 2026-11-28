# SPORT design system

Owner: Claude Code (`packages/ui`). Codex uses these components in `apps/admin` and asks for new ones in `CONTRACT-REQUESTS.md` → *For Claude Code*.
See every component and state at **`/dev/ui`** (run `pnpm dev`, or build with `ENABLE_DEV_UI=true`).

## Direction: Pitch-side

Owner decision (2026-11-28, `docs/decisions.md`): scoreboard-style condensed type, chalk pitch lines on deep green, lime only for actions and selections. This doc turns that into rules.

- **Deep pitch green carries the brand.** Top bars, the operator sidebar, the footer and one highlight per screen.
- **Chalk lines are the signature.** `PitchLines` draws a halfway line, centre circle and penalty boxes on pitch-green bands (home hero, footer) and faintly behind empty states. Nowhere else.
- **Lime means "do this" or "you chose this".** The primary button, a selected time slot or day, the active tab pill, the current page in the operator sidebar. Never as decoration, never for headings, never two lime buttons side by side.
- **Times and prices read like a scoreboard.** Condensed display face, tabular numerals (`scoreboard` utility): `19:00`, `EGP 450`.
- **Quiet everywhere else.** Hairline borders, flat surfaces, almost no shadow. SPORT Admin is calmer still: neutral surfaces, pitch green only for the current page.

## Colour roles

Use the role, not the hex. Utilities: `bg-surface`, `text-ink`, `bg-action`, `border-line` and so on. Values live in `packages/ui/src/styles.css`.

| Role | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#f3f6f1` chalk | `#06170f` | Page |
| `surface` | `#ffffff` | `#0b2419` | Cards, inputs, sheets |
| `sunken` | `#e7eee4` | `#103022` | Skeletons, disabled, table header |
| `ink` | `#0e1c15` | `#eef3ec` | Text |
| `ink-muted` | `#4a5b51` | `#a3b6aa` | Secondary text |
| `line` / `line-strong` | `#cfdbd2` / `#748a7c` | `#21463a` / `#4b7262` | Dividers / input borders (3:1) |
| `pitch` / `pitch-raised` | `#0d3a28` / `#165c3f` | `#0d3a28` / `#14523a` | Brand bands, secondary button |
| `on-pitch` / `on-pitch-muted` | `#f3f6f1` / `#b9cdbf` | same | Text on pitch green |
| `action` (+ hover, press) | `#d4f74a` | `#d4f74a` | Primary action, selection |
| `on-action` | `#0e1c15` | `#0e1c15` | Text on lime |
| `link` | `#135a3b` | `#c7ef3a` | Inline links |
| `focus` | `#1f7a4f` | `#d4f74a` | Focus ring |
| `success` · `warning` · `danger` · `info` (+ `-soft`) | | | Status pills, alerts |

**Contrast is tested, not eyeballed.** `packages/ui/test/contrast.test.ts` reads `styles.css` and checks every text pair at 4.5:1 and every boundary at 3:1 in both themes. `scripts/check-pages.mjs` runs axe (WCAG 2.1 AA) on the pages. Add a pair to the test when you add a role.

**Dark mode** follows the system (`prefers-color-scheme`) unless `data-theme="light|dark"` is set on `<html>`. Components never need `dark:` for colour, because the roles switch. `dark:` is used only where the light and dark choices differ in kind (e.g. a lime underline instead of pitch green in dark).

## Type

| Face | Role |
|---|---|
| **Big Shoulders** (Google Fonts, `opsz` axis, weights 800–900) | Display: headings, prices, times, wordmark |
| **Barlow** 400–700 | Body and UI |
| **Noto Kufi Arabic** 400–800 | Both roles when `lang="ar"` |

Scale (major third on 16px): `xs 12 · sm 14 · base 16 · lg 20 · xl 25 · 2xl 31 · 3xl 39 · 4xl 49`. Hero headlines may go to 72px on desktop.
Rules: sentence case everywhere (no all-caps labels); headings are `font-display font-extrabold|black` with tight leading; body text lines stay under ~75 characters (`max-w-prose`/`max-w-md`).

## Space, radius, elevation, motion

- **Spacing:** Tailwind's 4px grid. Page gutter 16px on phones, 24px from 640px. Cards pad 16/20px. Sections 32–40px apart.
- **Radius by size, not one radius everywhere:** `sm 6px` chips, inputs, badges · `md 10px` buttons, slots · `lg 16px` cards · `xl 24px` dialogs and the top of bottom sheets · `full` avatars and status pills.
- **Elevation:** flat by default (border only). `shadow-raised` for one summary card; `shadow-overlay` for dialogs, sheets and toasts only.
- **Motion:** 120ms presses, 200ms enter, 280ms sheets, `ease-out (0.2, 0.8, 0.2, 1)`. Motion only answers an action (sheet slides in, toast pops, dialog fades). No scroll-triggered entrances. `prefers-reduced-motion` turns it all off.

## Touch, keyboard, screen readers

- Every target is **at least 44×44px** (`min-h-11`, `size-11`). Card links stretch over the whole card.
- Visible focus ring on everything (`focus-visible`, 2px, offset 2px).
- Each shell has a "Skip to content" link. Current page = `aria-current="page"`.
- Time slots and toggle groups use `aria-pressed`; the day strip is a radio group with arrow keys, Home and End; galleries are labelled carousels with arrow keys and a live "Photo 2 of 3" announcement.
- Loading regions say "Loading…" to screen readers; errors use `role="alert"` and say what to do next.

## Languages and RTL (open decision 4: decided English + Arabic)

Arabic is planned, so RTL is built in from day one:
- Layout uses **logical properties only** (`ms-/me-`, `ps-/pe-`, `start-/end-`, `text-start`, `border-s`). Never `left/right`, `ml/mr`, `pl/pr`.
- Direction icons (chevrons) get `rtl-flip`. Arrow keys follow the reading direction.
- `lang="ar"` swaps both font roles to Noto Kufi Arabic. The SPORT wordmark stays Latin (`dir="ltr"`).
- Numbers, times and prices stay in Latin digits for the pilot (`formatMoney(…, 'ar')` is ready if the owner wants Arabic digits).
- Check: `/dev/ui?dir=rtl`, and `check-pages.mjs` screenshots RTL at 390px and 1280px.

## Components (`@sport/ui`)

| Component | Notes |
|---|---|
| `Button` | `primary` (lime, one per view), `secondary` (pitch), `outline`, `ghost`, `danger`, `link`; `sm/md/lg/icon`, `block`, `loading` |
| `Field`, `Input`, `Textarea`, `Select`, `Checkbox` | `Field` wires label, hint and error ids. `Select` is native on purpose: the phone's own picker |
| `Tabs` | Radix; `sticky` list for profile tabs |
| `Card` | `flat`, `raised`, `sunken`, `pitch` |
| `OperatorCard` (+ `Skeleton`) | R3: photo, name, rating, area, sports, starting price; `stack` or `row` |
| `VenueCard` (+ `Skeleton`) | R6: 2–3 branch photos in a swipe gallery, surfaces, indoor/outdoor, floodlit, price from |
| `PhotoGallery` | Scroll-snap swipe, keyboard, full-screen dialog, videos |
| `Rating`, `PriceTag`, `Avatar` | Prices in **minor units** + currency |
| `Badge`, `StatusPill` | `STATUS_META` is the one map of status → wording → colour |
| `Dialog`, `Sheet` | Sheet is a bottom sheet on phones and an end-side panel from 640px |
| `ToastProvider` / `useToast` | Above the bottom nav on phones |
| `Skeleton`, `LoadingRegion`, `EmptyState`, `ErrorState` | Every data screen uses these |
| `DatePicker` (+ `MonthGrid`) | Two-week day strip, month view for later dates, weeks start Saturday |
| `TimeSlotGrid` | `single` (coach) or `range` (back-to-back court hours); `nextSelection` is the pure rule |
| `Stepper` | Applications and profile builder; per-step `error` status |
| `FileUploader` | Drag and drop, previews, progress, retry, size limits, "Pending review" |
| `DataTable` | Sortable table from 640px, stacked cards on phones; loading/empty/error built in |
| `Calendar`, `CalendarToolbar`, `CalendarLegend` | Day (courts as columns) or week (days as columns); bookings, walk-ins, holds, closures; tap a free hour |
| `AthleteShell`, `OperatorShell`, `AdminShell` | Pass Next.js `Link` as `linkAs` |

Components are presentational: they take plain props and never fetch. Screens map contract types from `@sport/shared` onto these props.

## Writing

Plain verbs, sentence case, the user's words. A button says what happens ("Book this time", "Add walk-in"); the toast repeats it ("Walk-in added"). Errors say what went wrong and what to do. Empty states offer the next step. Keep the names from `AGENTS.md`: Courts, Coaches, Gyms, Academies, EGP, Cairo time.
