# SPORT database

Run from the repository root with the pinned pnpm version and Docker running:

```sh
pnpm --filter @sport/db exec supabase db start
pnpm --filter @sport/db exec supabase db reset
pnpm --filter @sport/db exec supabase test db
pnpm --filter @sport/db exec supabase gen types typescript --local --schema public > packages/db/src/database.types.ts
pnpm exec prettier --write packages/db/src/database.types.ts
```

The reset recreates the local database and loads the sample catalog. The seed
includes two athletes, Owner and Finance staff accounts, and four live listings for each
operator type. Sample account names and the local demo password are in
`supabase/seed.sql`.

Use Supabase migrations here for the new applications. The separate
`db/schema.sql` at the repository root serves the legacy preview API.

CX1 grants clients scoped reads through RLS. Later tasks add the write paths
for accounts, bookings, applications, and staff operations. Staff access
requires an active staff record, an MFA session, and a permission from an
assigned role.
