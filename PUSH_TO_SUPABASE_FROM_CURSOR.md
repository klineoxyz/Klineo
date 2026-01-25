# Push to Supabase from Cursor

**Yes — you can push migrations to Supabase from Cursor using the terminal.**

---

## How it works

1. **Supabase CLI** runs in Cursor’s terminal.
2. Migrations live in **`supabase/migrations/`**.
3. **`supabase db push`** sends those migrations to your linked Supabase project.

---

## One-time setup

### 1. Dependencies (optional)

The scripts use **`pnpm dlx supabase`**, which downloads and runs the Supabase CLI on demand. You don't need to install it locally.

If you prefer using the project's Supabase package instead, run **`pnpm install`** in an **external terminal** (e.g. PowerShell outside Cursor) so the postinstall script can download the CLI binary. Then change the scripts back to `pnpm exec supabase` in `package.json`.

### 2. Log in to Supabase

```bash
pnpm supabase:login
```

A browser window opens. Sign in with your Supabase account and approve access.

### 3. Link your project

Your project ref (from the URL `https://oyfeadnxwuazidfbjjfo.supabase.co`) is **`oyfeadnxwuazidfbjjfo`**.

```bash
pnpm supabase:link
```

If you use a different project, edit the `supabase:link` script in `package.json` and set `--project-ref` to your project ref.

When prompted for a **database password**, use the one you set when creating the Supabase project (or reset it in **Project Settings → Database**).

---

## Push migrations from Cursor

Whenever you want to apply your migrations to Supabase:

1. **Open the terminal** in Cursor (`` Ctrl+` ``), or use **PowerShell** / **cmd** in your project folder.
2. **Run:**

```bash
pnpm supabase:push
```

This runs **`supabase db push`** (via `pnpm dlx`) and applies all migrations in `supabase/migrations/` to your linked project.

**If you get network or “command not found” errors in Cursor’s terminal:** run the same command in an **external terminal** (PowerShell, cmd) — `pnpm dlx` needs network to fetch the CLI.

---

## What gets pushed?

Migrations in **`supabase/migrations/`**:

| File | Purpose |
|------|---------|
| `20260125000000_initial_schema.sql` | Base schema: `user_profiles`, RLS, trigger |
| `20260125100000_ui_fields_user_profiles.sql` | UI fields: `full_name`, `username`, `timezone`, `referral_wallet` |

---

## Troubleshooting

### “supabase is not recognized” / “Command not found: supabase”

- The scripts now use **`pnpm dlx supabase`**, which fetches and runs the CLI on demand. Ensure you have **network access** when running them (e.g. run in an external terminal if Cursor's sandbox blocks network).
- If you use `pnpm exec supabase` instead, the Supabase package downloads the binary during **postinstall**. Run **`pnpm install`** in an **external terminal** (outside Cursor) so that download can complete, then run the scripts again.

### “Project not linked”

- Run **`pnpm supabase:link`** and complete the flow.
- Ensure the project ref in the `supabase:link` script matches your Supabase project.

### “Database password” prompt

- Use your Supabase **database password** (Project Settings → Database).
- If you don’t remember it, use **Reset database password** in the same place.

### Network / sandbox errors

- If commands fail in Cursor’s terminal (e.g. network blocked), run the same commands in an **external terminal** (PowerShell, cmd) in your project folder.

### “Migration already applied”

- `supabase db push` only runs **new** migrations. If you’ve already applied them (e.g. via Dashboard SQL Editor), that’s expected. To fix conflicting state, you’d need to repair migration history (advanced) or use the Dashboard for one-off fixes.

---

## Quick reference

| Task | Command |
|------|---------|
| Log in | `pnpm supabase:login` |
| Link project | `pnpm supabase:link` |
| Push migrations | `pnpm supabase:push` |

---

## Alternative: Supabase Dashboard

If you prefer not to use the CLI:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor** → **New Query**.
3. Paste the contents of **`supabase-schema-fixed.sql`** (or **`supabase-migration-ui-fields.sql`**).
4. Click **Run**.

That applies the SQL manually instead of using migrations. Pushing from Cursor uses the **CLI + migrations** approach above.
