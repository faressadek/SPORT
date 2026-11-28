# SPORT architecture

SPORT is one connected sports marketplace, starting in Alexandria. Athletes and parents use a mobile-friendly app in Arabic or English. Coaches, venues, gyms and academies each get a workspace built around their daily work. Platform admins oversee providers, bookings and payment issues. **Every view reads and writes the same data.**

## One booking, seen by everyone

A venue employee records a walk-in on Court 2 from 19:00 to 20:00. That court and hour must then disappear from the athlete's available times. They must also disappear as an option for any coach who needs a court.

An athlete books a coach and a court together. Both calendars update. The athlete gets one confirmation with an itemized price, and support finds the whole booking by one reference.

**First end-to-end demo:** record a walk-in on the venue dashboard, then open the athlete app and show that the same court and hour can't be booked.

## How people enter the app

Everyone lands in the athlete app. At the bottom of the screen, one line asks "Are you a coach or a venue?" and leads to the operator side.

```
 Open SPORT
     │
     ▼
 Athlete app (home) ─── book, find, compare, enquire
     │
     └─ "Are you a coach, venue, gym or academy?"   (bottom of home)
             │
             ▼
     Choose what you run
     ┌────────────┬──────────────┬────────────┬──────────────┐
     │   Coach    │ Courts/venue │    Gym     │   Academy    │
     └─────┬──────┴──────┬───────┴─────┬──────┴──────┬───────┘
           ▼             ▼             ▼             ▼
     Coach workspace  Venue workspace  Gym workspace  Academy workspace
     lands on:        lands on:        lands on:      lands on:
     Today's sessions Today's courts   Enquiries      Programs & trials
```

- **Sign-in:** the role is picked once, at sign-up, and kept on the account. After that, signing in opens that workspace directly. One person can hold more than one role, for example a coach who also runs an academy. Their workspace then has a switcher.
- **Approval:** a new provider can set up their workspace at once. Their listing appears to athletes only after an admin approves it.
- **Admins** don't pick a role. Staff accounts open the admin workspace.

## What each workspace is for

| Who | Lands on | Pages |
|---|---|---|
| Athlete or parent | Home: search, next free pitches, Courts / Coaches / Gyms / Academies | Book a court, book a coach (with a court when the coach has no venue), compare gyms, enquire about an academy, My bookings |
| Coach | **Today**: who is coming, where to meet, mark attendance | Schedule (hours, training locations, closures), Sessions and prices, Bookings, Profile |
| Venue / court owner | **Today's courts**: every court on one calendar | Add a walk-in or block, close a court, opening hours, prices per court and hour, check players in |
| Gym owner | **Enquiries**: new → contacted → visited → joined | Membership plans and billing periods, facilities, hours, listing |
| Academy owner | **Programs and trials** | Programs by sport, age, level and schedule, parent enquiries and replies, trial sessions, listing |
| Platform admin | **Needs attention**: approvals and exceptions | Approve providers, moderate listings, booking conflicts, payments and refunds |

All provider workspaces live in one provider portal. After sign-in, the role decides the navigation and the landing screen. Shared parts are written once: calendar, enquiry list, listing editor.

## Booking rules

- **Courts and Coaches are separate entry points.** On Courts, the athlete books a court on its own. On Coaches, a coach with a listed venue is booked there. Only a coach without a listed venue offers "use a location you arranged" or "add a court" (shared times only, itemized prices, both reserved together).
- **One source of availability.** The athlete app, the coach roster and the venue front desk read the same schedule. Football pitches belong to a club and branch, and the coach flow uses that same pitch inventory.
- **The backend decides.** It calculates the price, checks availability again at confirmation, and reserves every resource together or none. If the last court is taken, the athlete sees updated options, and the coach stays free.
- **Booking and payment states stay separate:** slot held → payment received → booking confirmed, or refund pending. Closing the browser during checkout never leaves the athlete guessing.
- **Gyms and academies start with discovery and enquiries.** A parent asking about an under-12 program has a different journey from a player booking a court tonight.

## System

```
 Athlete app ──┐                       ┌── Worker: expire holds, reconcile payments,
               ├──►  Node API  ──►  PostgreSQL     send notifications
 Provider/     │   identity, roles,    (one database:
 admin portal ─┘   inventory, prices,   bookings, schedules, listings,
                   bookings, payments,  enquiries, payments, outbox)
                   enquiries
```

- **The API owns** identity, permissions, inventory, bookings, payments and enquiries. Apps never decide prices or availability.
- **Each provider** sees only its own records. The admin can trace exceptions across the system.
- **Several API servers** can run on one database. The database is the final guard against double booking (exclusion constraint on half-open time ranges).

## Where we are (28 Nov 2026)

| Part | Status |
|---|---|
| Athlete app: Courts (clubs and branches), Coaches with court add-on, Gyms, Academies, Arabic | Built (Pitch-side design) |
| Bookings, payments simulator, refunds, enquiries in PostgreSQL | Built and tested |
| Provider hours and closures (coach or club) | Built |
| Operator entry and role picker (`apps/provider/index.html#/join`) | Built |
| Coach app: Today's sessions with attendance, Schedule, Prices, Bookings | Built |
| Venue app: Today's courts (walk-in, block, check-in), Hours & closures, Prices | Built. **First demo works** |
| Gym app: Enquiries pipeline, Plans & prices, Facilities & hours | Built |
| Academy app: Programs, Trials, Enquiries | Built |
| Admin workspace (`apps/provider-admin`) | Basic: bookings, listings moderation, refunds |
| Provider app in Arabic | To build |
| Real sign-in and sign-up with roles, admin approval | To build (demo tokens today) |
| Paymob sandbox, worker, notifications | To build |

## Suggested build order

1. **Operator entry and role picker,** plus the venue workspace with "Today's courts" and walk-ins. This delivers the first demo.
2. **Coach workspace:** Today roster, attendance, and schedule (already built).
3. **Gym and academy workspaces:** enquiry pipeline, programs and trials.
4. **Real sign-up and sign-in with roles,** plus admin approval of providers.
5. **Payments:** Paymob sandbox, worker and notifications.
