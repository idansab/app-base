# Admin Setup Guide

## Prerequisites

1. **Supabase Project** - Create one at https://supabase.com
2. **Environment Variables** - Set in `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

Get these from Supabase Dashboard → Settings → API

## Setup Steps

### Option 1: Using SQL Migration (Recommended)

1. **Copy and paste the SQL migration** from `supabase/migrations/01_create_profiles.sql` into Supabase SQL Editor
2. **Execute** the SQL
3. **Create admin user manually** in Supabase Dashboard:
   - Auth → Users → Add user
   - Email: your-admin@example.com
   - Password: secure-password
4. **Update profile** to admin:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'USER_ID_HERE';
```

### Option 2: Using Setup Script

1. **Make script executable:**
```bash
chmod +x scripts/setup-admin.js
```

2. **Run setup:**
```bash
node scripts/setup-admin.js
```

3. **Answer the prompts:**
   - Enter admin email
   - Enter admin password (min 6 chars)

4. **Done!** Script will create user and set role to admin

## First Login

1. Navigate to `http://localhost:5173/admin-login`
2. Enter email and password
3. Click "התחבר" (Connect)

## Troubleshooting

**"אינך מורשה לגישה ל Admin"** (Not authorized for Admin)
- Check that the `profiles` table exists
- Verify the user's `role` is set to `'admin'` in the profiles table

**"אימייל או סיסמה לא נכונים"** (Wrong email or password)
- Verify email and password match what was created
- Make sure email is confirmed in Supabase

**Missing profiles table**
- Run the SQL migration from `supabase/migrations/01_create_profiles.sql`

## Admin Panel Features

Once logged in as admin, you can:

- 🔍 **Search** places by name
- 🏷️ **Filter** by status (approved, pending, rejected)
- 📊 **Sort** by date, rating, or name
- ☑️ **Bulk approve/reject** multiple places
- ✏️ **Edit** place details
- 🗑️ **Delete** places
- 👁️ **Approve** pending contributions

## Security

- ✅ JWT-based authentication via Supabase
- ✅ Role-based access control (RBAC)
- ✅ Server-side authorization checks
- ✅ Row-level security (RLS) policies
- ✅ Automatic profile creation on signup

## Environment Variables Required

For the setup script to work:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

The service key is sensitive - keep it in `.env.local` or `.env.example` (add to .gitignore)
