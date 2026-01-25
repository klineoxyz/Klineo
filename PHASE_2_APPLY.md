# Phase 2 — Apply migrations and seed

Apply Phase 2 migrations (traders, performance, copy_setups, etc.) to Supabase, then run the dev seed.

---

## Option A: Supabase Dashboard — bundled (recommended)

1. Generate the bundle: **`pnpm db:migrate:bundle`**
2. Open **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
3. Open `supabase/migrations-all-bundled.sql`, copy all, paste into the editor, **Run**.

This runs **all** migrations (initial + UI fields + Phase 2) **and** the seed in one go. No `SUPABASE_DB_URL` needed.

---

## Option B: Supabase Dashboard — run files one by one

1. **Supabase Dashboard** → your project → **SQL Editor** → **New query**.
2. Run each migration file **in order** (copy-paste, then Run):
   - `supabase/migrations/20260125000000_initial_schema.sql`
   - `supabase/migrations/20260125100000_ui_fields_user_profiles.sql`
   - `supabase/migrations/20260126100000_traders_and_performance.sql`
   - … through `20260126150000_notifications_contact_newsletter_master.sql`
3. Run **seed**: `supabase/seed.sql`

**Note:** Base schema (`user_profiles`, RLS, trigger) is in the initial migrations. Phase 2 adds the **new** tables.

---

## Option C: Supabase CLI

From project root:

```bash
pnpm supabase:link   # if not already linked
pnpm supabase:push   # applies migrations in supabase/migrations/
```

Then run the seed manually:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

(`SUPABASE_DB_URL` from `.env.local` or `.env`. Use **Session** / direct DB URL, not Transaction pooler, for migrations.)

---

## Option D: Local script (`SUPABASE_DB_URL`)

```bash
pnpm db:migrate
```

Requires `SUPABASE_DB_URL` in `.env.local`. Uses **Session** connection (port 5432); Transaction pooler (6543) can cause "Tenant or user not found" with DDL.

---

## Verify

- **Table Editor**: `traders`, `trader_performance`, `user_exchange_connections`, `user_risk_settings`, `copy_setups`, `positions`, `orders`, `trades`, `fee_ledger`, `referrals`, `referral_earnings`, `subscription_plans`, `subscriptions`, `payments`, `notifications`, `contact_submissions`, `newsletter_subscribers`, `master_trader_applications`.
- After seed: a few rows in `traders`, `trader_performance`, `subscription_plans`.

---

## Troubleshooting

- **"relation already exists"**: Migrations use `IF NOT EXISTS`; usually safe. If you hit conflicts, fix or reset DB and re-run.
- **Seed "No user_profiles"**: Create a user via app (Sign up) or Auth UI, then re-run `supabase/seed.sql`.
