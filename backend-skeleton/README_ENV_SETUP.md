# Backend Environment Setup

## Quick Fix for "FRONTEND_URL environment variable is required"

The `.env` file has been created in `backend-skeleton/`. You need to add your Supabase service role key.

### Steps:

1. **Get your Supabase Service Role Key**:
   - Go to: https://supabase.com/dashboard/project/oyfeadnxwuazidfbjjfo/settings/api
   - Find "service_role" key (NOT the anon key)
   - Copy it

2. **Update `backend-skeleton/.env`**:
   - Open `backend-skeleton/.env`
   - Replace `your-service-role-key-here` with your actual service role key
   - Save the file

3. **Restart the backend**:
   ```bash
   cd backend-skeleton
   pnpm dev
   ```

### Current `.env` file location:
`backend-skeleton/.env`

### Required variables:
- ✅ `FRONTEND_URL=http://localhost:5173` (already set)
- ✅ `SUPABASE_URL=https://oyfeadnxwuazidfbjjfo.supabase.co` (already set)
- ⚠️ `SUPABASE_SERVICE_ROLE_KEY=...` (YOU NEED TO ADD THIS)
- ✅ `ADMIN_EMAILS=mmxinthi@gmail.com` (already set)

### Note:
The `.env` file is in `.gitignore` and won't be committed to Git.
