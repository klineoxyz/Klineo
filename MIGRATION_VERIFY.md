# Runner migrations verification

Use this to confirm runner-related tables and columns exist and match backend expectations. **Do not guess schema** — verify in Supabase after applying migrations.

## Migrations order

1. **20260129150000_strategy_runs_and_events.sql** — `strategy_runs`, `strategy_events`
2. **20260129160000_strategy_runner.sql** — `strategies` (legacy), `strategy_tick_runs`, `strategy_risk_state`, `strategy_locks` (original)
3. **20260129170000_unify_runner_strategy_runs.sql** — adds `last_run_at` to `strategy_runs`; points `strategy_tick_runs` and `strategy_locks` at `strategy_runs`

## Expected schema (after all three)

### strategy_runs

| Column                   | Type        | Notes                          |
|--------------------------|-------------|--------------------------------|
| id                       | UUID PK     |                                |
| user_id                  | UUID FK     | user_profiles(id)              |
| exchange_connection_id   | UUID FK     | user_exchange_connections(id)  |
| exchange, market_type    | TEXT        |                                |
| symbol, timeframe        | TEXT        |                                |
| direction, leverage      | TEXT / INT  |                                |
| order_size_pct, ...      | NUMERIC     |                                |
| status                   | TEXT        | draft \| active \| paused \| stopped |
| **last_signal_at**       | TIMESTAMPTZ | From 20260129150000            |
| **last_run_at**          | TIMESTAMPTZ | From 20260129170000            |
| created_at, updated_at   | TIMESTAMPTZ |                                |

Backend expects: `last_run_at`, `last_signal_at` (both optional / nullable).

### strategy_tick_runs

| Column            | Type        | Notes                    |
|-------------------|-------------|--------------------------|
| id                | UUID PK     |                          |
| **strategy_run_id** | UUID FK   | → strategy_runs(id)      |
| user_id           | UUID FK     | user_profiles(id)        |
| scheduled_at      | TIMESTAMPTZ | NOT NULL                 |
| started_at        | TIMESTAMPTZ | NOT NULL                 |
| finished_at       | TIMESTAMPTZ |                          |
| status            | TEXT        | ok \| skipped \| blocked \| error |
| reason            | TEXT        |                          |
| signal            | TEXT        | buy \| sell \| hold       |
| latency_ms        | INT         |                          |
| meta              | JSONB       |                          |

Backend expects: FK `strategy_run_id` → `strategy_runs(id)` (from 20260129170000). No `strategy_id` column after unification.

### strategy_locks

| Column            | Type        | Notes                |
|-------------------|-------------|----------------------|
| **strategy_run_id** | UUID PK   | → strategy_runs(id)  |
| locked_until      | TIMESTAMPTZ | NOT NULL            |
| lock_owner        | TEXT        | NOT NULL             |
| updated_at        | TIMESTAMPTZ | NOT NULL             |

Backend expects: PK is `strategy_run_id` referencing `strategy_runs(id)` (from 20260129170000).

## How to verify in Supabase

1. **Dashboard → Table Editor**
   - Open `strategy_runs`: confirm columns `last_run_at` and `last_signal_at` exist.
   - Open `strategy_tick_runs`: confirm column `strategy_run_id` exists and there is **no** `strategy_id` (or it was dropped). Check FK: `strategy_run_id` → `strategy_runs(id)`.
   - Open `strategy_locks`: confirm PK is `strategy_run_id` and FK to `strategy_runs(id)`.

2. **SQL Editor** (optional)

   ```sql
   -- strategy_runs has last_run_at and last_signal_at
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'strategy_runs'
   AND column_name IN ('last_run_at', 'last_signal_at');
   -- Expect 2 rows.

   -- strategy_tick_runs uses strategy_run_id
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'strategy_tick_runs'
   AND column_name = 'strategy_run_id';
   -- Expect 1 row.

   -- strategy_locks PK is strategy_run_id
   SELECT a.attname
   FROM pg_index i
   JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) AND a.attisdropped = false
   WHERE i.indrelid = 'public.strategy_locks'::regclass AND i.indisprimary;
   -- Expect strategy_run_id.
   ```

3. **RLS**
   - Backend uses **service role** for runner (cron, tick runs, locks). Service role bypasses RLS.
   - For admin UI: `strategy_tick_runs` SELECT policy allows `auth.uid() = user_id` or admin; admin JWT is required for GET /api/runner/tick-runs and /status.

## If something is missing

- **Do not edit existing migrations.** Add a **new** migration (e.g. `YYYYMMDDHHMMSS_runner_fix_*.sql`) that:
  - Adds missing columns to `strategy_runs` (e.g. `last_run_at` if absent),
  - Adds `strategy_run_id` to `strategy_tick_runs` and drops old FK/column if needed,
  - Or recreates `strategy_locks` with `strategy_run_id` as PK if needed.
- Re-run verification after applying the new migration.
