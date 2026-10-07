# Supabase Authentication Setup

## ✅ Frontend is ready
Login, Register, and Protected Routes are implemented.

## ⚠️ Next: Enable Supabase Auth

1. **Go to Supabase Dashboard:**
   - Open https://app.supabase.com
   - Select your project

2. **Enable Email Auth:**
   - Settings → Authentication → Providers
   - Enable "Email" provider

3. **Copy ANON_KEY:**
   - Settings → API
   - Copy **anon public key**
   - Add to `.env.local`:
   ```
   REACT_APP_SUPABASE_ANON_KEY=your_key_here
   ```

4. **Enable Row Level Security (RLS):**
   - SQL Editor → paste content from `supabase/migrations/002_enable_rls_auth.sql`
   - Run the query

5. **Test:**
   ```bash
   npm run dev
   ```
   - Go to `/register` and create account
   - Then use `/login` to sign in
   - Try `/contribute` — should now work only when logged in

## Features Protected by Auth

- ✅ Add Place (green + button)
- ✅ Add to Favorites 
- ✅ Create Trips
- ✅ Admin Dashboard

All data automatically includes `user_id` via RLS.
