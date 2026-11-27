# SPORT project handoff

**Snapshot:** 27 November 2026, Cairo time  
**Scope:** Sports Marketplace Concept, the technical continuation, and Continue App UX UI.  
**For the receiving agent:** Start here, then read the SRS, work plan, booking spec, and prototype README. The latest user correction below controls navigation and booking behavior wherever an older artifact uses “three booking options” or implies a standalone combined path.

## 1. Owner's vision and decisions

SPORT is an Egyptian sports marketplace for athletes and parents. People can book courts, find and book coaches, compare nearby gyms, and search for sports academy programs. The working launch plan is a mobile-friendly web pilot in **Alexandria, starting with padel**. Kick Smash Padel Academy provides relevant firsthand coach and venue experience. Cairo, wider Egypt, and eventually MENA were discussed as expansion directions. No expansion commitment was made.

**The booking experience has two top-level pages.**

| Journey | Current product rule |
|---|---|
| **Courts** | Find a court, pick an available time, and book that court on its own. |
| **Coaches** | Find a coach, choose a session, and see where the coach trains. A coach with a listed venue can be booked on their own, at the listed venue. |
| **Add a court on Coaches** | Show this only when the selected coach has no listed training location. The athlete can enter a venue they arranged or add a compatible court. When they add a court, find shared availability, display separate prices and a total, and reserve both resources together. This is an option within the coach flow. |
| **Gyms** | Search nearby gyms and compare price, billing period, location, and facilities. Provide a direct enquiry option. |
| **Academies** | Athletes and parents can search listings by sport, area, age group, and skill level, then see program details, schedules, price and billing period, location, and contact options. Search and direct enquiries are the first-release assumption. In-app enrollment and payments remain open. |

The original concept requested four interfaces: **athlete, coach, venue/gym operator, and platform admin**. Academy operators are now represented in the requirements. A shared provider app with role-specific views was suggested to keep coach, venue, gym, and academy tools maintainable. Providers manage their own listings and schedules. Admins publish or moderate listings and investigate booking or payment exceptions.

Arabic and English with right-to-left support were discussed for the Egyptian product. The current demo is English. Additional sports, native apps, AI, tournaments, community, memberships, and provider payouts were discussed as future scope. Commissions and provider SaaS subscriptions are business-model ideas. Pricing, adoption, and merchant terms are unvalidated.

## 2. What each chat contributed

| Conversation | Main work and decisions |
|---|---|
| **Sports Marketplace Concept** | Defined the Egypt sports marketplace, four interfaces, Alexandria pilot, expansion direction, initial gym comparison, provider tools, and possible business models. Reviewed four competitors in depth, six sports repos, and ten engineering references. Separated public evidence from assumptions and proposed a phased engineering plan. |
| **Technical continuation** | Recovered the research; reviewed Cal.diy scheduling, Medusa and Saleor payment models, and Egyptian payment-provider documentation. Drafted the SRS and booking spec, created the work plan, and built the PostgreSQL and Node prototype, tests, CI workflow, and role rules. Added academy discovery and documented the latest coach-to-court flow. |
| **Continue App UX UI** | Explored sports discovery, booking calendars, and reference components. The user cloned 22 repos in a sibling workspace folder for review. The first preview put three booking modes at the top level. The user corrected it to separate Courts and Coaches pages with a conditional court add-on. They also explicitly asked the agent to start with the reference repos and mix patterns that fit SPORT. The current preview reflects that flow and the selected reference patterns. |

## 3. Design direction

The owner's latest instruction is to **inspect the repos first, choose patterns because SPORT needs them, and combine those patterns**. For each proposal or implementation, identify the repo, component or pattern, the SPORT screen it belongs to, and why it fits. Preserve the two booking pages and conditional court add-on. The user wants a high-quality, distinctive sports product. Avoid adding branding, motion, or decorative effects simply to make the preview busier.

The current standalone HTML preview uses sample availability, prices, coaches, and courts. It is intentionally separate from the SQL prototype. Reference patterns already applied:

| Source | What was adapted |
|---|---|
| MultiSport Booking System | Coach and court cards with prices visible before selection. |
| BookingCalendar | Date selection followed by available time slots. |
| Motion Primitives | Moving selection background for the Courts and Coaches navigation. |
| Vaul | Mobile review bottom sheet and desktop review dialog. SPORT uses a native dialog in the current HTML. |

Some earlier inspirations included Nike, Airbnb, Playtomic, Apple Fitness+, Strava, and Linear. Other suggested flows included maps, discovery by sport, coach profiles, calendars, academy experiences, and QR passes. These were inspiration and exploration. The latest user guidance is to ground interface work in the cloned repos. The four patterns above were adapted in the preview. The remaining repos are available for future evaluation and were not installed as dependencies.

## 4. Architecture, implementation, and evidence

**Proposed production baseline:** Next.js and TypeScript, NestJS, PostgreSQL/PostGIS, and a modular backend with separate booking, payments, and provider management areas. Earlier candidates included Expo/React Native for later mobile apps, Prisma, Redis/BullMQ, Supabase Auth, mapping providers, R2, Cloudflare, Docker, monitoring, GitHub Actions, and a pnpm/Turborepo workspace. These candidates are not an implemented stack or locked procurement decisions. The present booking prototype uses Node's built-in HTTP server, PostgreSQL SQL, and `psql`. It has no npm dependencies. The HTML is standalone.

- **Booking model.** Canonical court and coach IDs, one reservation with one allocation for each resource, and PostgreSQL range exclusion for overlap. Check availability again when creating a hold. Combined reservation succeeds or rolls back as a unit. Use half-open intervals, EGP minor units, UTC instants and explicit display time zones. The five-minute hold is a prototype default. Cairo is the pilot display time zone.
- **Prototype HTTP routes.** Availability, create a hold, start simulated checkout, simulate capture, fetch booking status, and cancel an owned hold. The server binds to loopback. It uses demo athlete tokens and seed resource IDs; the intended production contracts use offerings, compatibility, and provider schedules.
- **Payments.** Keep the booking, payment attempt, charge, compensation, and outbox separate. Process repeated provider events idempotently. A late or extra capture records one refund request and must preserve a newer reservation. Production payment evidence should be verified server-side. No funds move in the simulator. Paymob is the first sandbox candidate and Kashier the fallback. FawryPay pay-by-reference was discussed, with timing and expiry still unverified for instant holds.
- **Identity.** Booking routes require the athlete role and use the authenticated subject. Provider membership and admin moderation rules have basic test coverage. Production authentication, persistent memberships, provider/admin routes, and provider isolation against the actual implementation remain open.
- **Verification.** Eight HTTP handler and policy checks passed with a controlled store. HTML interaction checks exercised booking navigation, location rules, shared slots, prices, review/dismissal, and simulated confirmation. The mobile visual layout has not been checked in a browser. The PostgreSQL concurrency and HTTP-to-database acceptance suite is authored but unrun. This workspace lacked `psql`, Docker's engine was unavailable, and loopback was blocked in an earlier attempt. GitHub CI is packaged but has not run. No SPORT repository or deployment was established in this project.
- **Preview limitations.** No live providers, availability, account data, or payments. The UI is not wired to the API. Demo sample prices and schedules may differ from the backend fixtures. Today the Padel example is a demo, not a live booking system.

## 5. Transfer these files

This bundle contains the actual files below, including unpacked source code. The links are useful in the owner's account. Give another agent the bundle if it cannot access these links.

| Artifact | Use |
|---|---|
| [SPORT_Master_SRS.md](https://chatgpt.com/library?file_id=libfile_20ef3275a0948191bd7f81de73d76087&account_id=personal) | Product requirements, acceptance criteria, and latest Courts/Coaches behavior in BKG-01 and AT-10. |
| [SPORT_Booking_Engine_Spec.md](https://chatgpt.com/library?file_id=libfile_ea63222e22f881918e355c284650916f&account_id=personal) | Booking schema, transactions, intended API, payments, and acceptance tests. |
| [SPORT_Work_Plan.md](https://chatgpt.com/library?file_id=libfile_e7e6b06134a08191af9aa4d6959649c2&account_id=personal) | Phases, implementation queue, research, decisions, and verification status. Its older “three choices” wording describes booking outcomes. Use the current SRS for navigation. |
| [SPORT_Booking_Preview.html](https://chatgpt.com/library?file_id=libfile_3bdff103240c819185271a471c695428&account_id=personal) | Open locally for the Courts and Coaches demo. Hash routes are `#/courts` and `#/coaches`. |
| [SPORT_Booking_Prototype.zip](https://chatgpt.com/library?file_id=libfile_1ee6ee9447048191bebfb5d5869ba6aa&account_id=personal) | Earlier standalone packaging of the same backend code. Use the unpacked `sport-booking-prototype/` in this handoff. |

Backend contents: `schema.sql`, `server.mjs`, `access.mjs`, `http.test.mjs`, `test.mjs`, `README.md`, and `.github/workflows/booking-acceptance.yml`. The workflow assumes the prototype files are at the repository root. Adjust its working directory if this becomes a monorepo package.

## 6. Next work in order

1. **Verify the database layer.** Start with the backend README and run `node --test http.test.mjs`. With disposable PostgreSQL and loopback available, run `node test.mjs --http`. The suite uses an isolated test schema and covers the three allocation outcomes, a shared-coach race, expiry and reallocation, replay, and late payment. Record actual results in the work plan. These are BOOK-01 and BOOK-04.
2. **Continue the UX from the cloned references.** Open both preview routes in a real browser at phone and desktop sizes. Verify keyboard navigation, focus after review dismissal, fixed versus flexible coach location, empty shared availability, and itemized totals. Then design the next screen from specific repo examples. Gym and academy discovery are separate pilot journeys.
3. **Build the engineering foundation.** Choose the SPORT repository destination, scaffold the app and API, establish migrations, run CI, and implement persistent identity and venue/coach/academy membership. Keep hosted publishing and live merchant setup explicit decisions.
4. **Connect the marketplace flows.** Add real provider listings, schedules and closures, eligibility, gyms and academies; connect the athlete UI to the API. Implement provider views and admin publishing/exception handling. Replace demo data with a seeded integration environment before a live pilot.
5. **Verify payment and launch decisions.** With Paymob sandbox access, verify checkout expiry, signed callbacks and retry behavior, lookup, refunds, duplicates, missing callbacks, late payment, settlement reports, and payouts. Use Kashier if a required behavior is unavailable. Confirm cancellation windows, fees and refund eligibility, settlement responsibilities, and merchant terms before live checkout. Pilot readiness also requires operational, recovery, and monitoring checks.

## 7. Research and references

**Egypt shortlist:** Matchena, Fit Circle, TRAINR, Padel Finder, Courty, and SportHills. The first four were reviewed in depth. Matchena informed facility and academy management. Fit Circle informed coaching workflows. TRAINR informed the multi-role marketplace; some dashboard experiences were marked “coming soon” during review. Padel Finder informed court discovery and venue onboarding. The review used public pages, browser-visible activity, and frontend material. Competitor production code, databases, and broad market exclusivity were unverified. Courty and SportHills remained shortlist entries.

**Six sports code references:** [Inov8rlabs/FitCircle](https://github.com/Inov8rlabs/FitCircle), [Brian's Padel Finder](https://github.com/brianfofficial/padelfinder), [RomelaGG backend](https://github.com/RomelaGG/PadelFinderBackend), [RomelaGG iOS](https://github.com/RomelaGG/PadelFinder-iOS), [JulAius/Padelfinder](https://github.com/JulAius/Padelfinder), and [thetrainrapp/train-app](https://github.com/thetrainrapp/train-app). Treat name matches as public engineering references. Some projects serve different markets or have different features from the similarly named competitors.

**Ten general engineering references:** [Cal.diy](https://github.com/calcom/cal.diy), [Easy!Appointments](https://github.com/alextselegidis/easyappointments), [Medusa](https://github.com/medusajs/medusa), [Saleor](https://github.com/saleor/saleor), [ERPNext](https://github.com/frappe/erpnext), [Supabase Auth](https://github.com/supabase/auth), [BullMQ](https://github.com/taskforcesh/bullmq), [Novu](https://github.com/novuhq/novu), [Chatwoot](https://github.com/chatwoot/chatwoot), and [Directus](https://github.com/directus/directus).

**Cloned UX references.** These were found in the Windows workspace at `C:\Users\pc\Documents\Codex\2026-11-26\new-chat-3\sport-references`. Each repo remains separate from SPORT code. The handoff includes their origins instead of duplicating the clones. Use `git clone --depth 1` for any reference needed on the receiving machine.

| Local folder | Origin |
|---|---|
| animate-ui | [Repository](https://github.com/imskyleen/animate-ui) |
| booking-calendar | [Repository](https://github.com/vladimir-siedykh/booking-calendar) |
| expokit | [Repository](https://github.com/expokit/expokit) |
| frontend-inspo-mcp | [Repository](https://github.com/notsointresting/frontend-inspo-mcp) |
| GSAP | [Repository](https://github.com/greensock/GSAP) |
| impeccable | [Repository](https://github.com/pbakaus/impeccable) |
| magicui | [Repository](https://github.com/magicuidesign/magicui) |
| maplibre-gl-js | [Repository](https://github.com/maplibre/maplibre-gl-js) |
| motion | [Repository](https://github.com/motiondivision/motion) |
| motion-app | [Repository](https://github.com/Motion-Sports-App/motion-app) |
| motion-primitives | [Repository](https://github.com/ibelick/motion-primitives) |
| MultiSport-Booking-System | [Repository](https://github.com/MultiSport-Team/MultiSport-Booking-System) |
| react-bits | [Repository](https://github.com/DavidHDev/react-bits) |
| react-native-bottom-sheet | [Repository](https://github.com/gorhom/react-native-bottom-sheet) |
| react-native-reanimated | [Repository](https://github.com/software-mansion/react-native-reanimated) |
| react-native-reanimated-carousel | [Repository](https://github.com/dohooo/react-native-reanimated-carousel) |
| react-native-skia | [Repository](https://github.com/Shopify/react-native-skia) |
| skills | [Repository](https://github.com/anthropics/skills) |
| taste-skill | [Repository](https://github.com/Leonxlnx/taste-skill) |
| ui | [Repository](https://github.com/shadcn-ui/ui) |
| ui-ux-pro-max-skill | [Repository](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) |
| vaul | [Repository](https://github.com/emilkowalski/vaul) |

## Instructions to paste into the receiving agent

> Continue the SPORT project using the attached bundle. Read this handoff, the SRS, and the work plan first. Follow the latest two-page booking rule: Courts books a court only, and Coaches shows the coach's training venue. Offer a court add-on only when the selected coach has no listed location. Keep gyms and academies as pilot discovery journeys. For UX, inspect the cloned repos and combine the patterns that fit SPORT. Explain which pattern comes from which repo. Test the flows against the real prototype where possible and record what passed and what remains open. Treat the sample UI, simulator, and proposed stack as prototype material. Continue independently on unblocked work and preserve the owner's product decisions.

This is a consolidated handoff from the project artifacts and the accessible history of the three chats. It is a summary, not a verbatim export. Some earlier turns were only recoverable through conversation summaries.
