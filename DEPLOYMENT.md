# Deployment Guide - Supabase + Cloudflare + GitHub

מדריך להעלאת האתר עם Supabase (database), Cloudflare (hosting), וGitHub (CI/CD)

## 🚀 Quick Start

### 1. Setup Environment Variables

Create `.env.local` in your project root:

```bash
# Supabase
VITE_SUPABASE_URL=https://gsbbtrknnkdihdlojwbd.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_supabase_key_here

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=2bf9335eb4120606b6337d0442cb902e
CLOUDFLARE_API_TOKEN=your_new_api_token
CLOUDFLARE_R2_ACCESS_KEY_ID=your_new_r2_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_new_r2_secret_key

# Backend
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**⚠️ NEVER commit this file to GitHub!** It's already in `.gitignore`

### 2. Setup GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add these secrets:
```
SUPABASE_URL                    = https://gsbbtrknnkdihdlojwbd.supabase.co
SUPABASE_SERVICE_ROLE_KEY       = (your service role key)
SUPABASE_ANON_KEY               = (your anon key)
CLOUDFLARE_API_TOKEN            = (your new token)
CLOUDFLARE_ACCOUNT_ID           = 2bf9335eb4120606b6337d0442cb902e
CLOUDFLARE_R2_ACCESS_KEY_ID     = (your new R2 key)
CLOUDFLARE_R2_SECRET_ACCESS_KEY = (your new R2 secret)
```

---

## 📊 Database Setup

### 1. Create Tables in Supabase

1. Go to: https://app.supabase.com/projects
2. Select your project
3. Go to SQL Editor
4. Create a new query
5. Paste the content from: `supabase/migrations/001_create_places_table.sql`
6. Click "Run"

Or use the CLI:
```bash
supabase db push
```

### 2. Migrate Your Data

```bash
npm run migrate:supabase
```

This will:
- Read `data/places.json`
- Upload all places to Supabase
- Show migration summary

---

## 🌐 Cloudflare Deployment

### 1. Install Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Deploy Frontend to Cloudflare Pages

```bash
npm run build
wrangler deploy
```

### 4. Setup Custom Domain

In Cloudflare Dashboard:
1. Go to Pages → Your Project
2. Custom domains → Add custom domain
3. Point `mayheshpo.com` to Cloudflare

---

## 🔄 GitHub Actions CI/CD

The workflow at `.github/workflows/deploy.yml` will automatically:

1. **Build** the frontend and backend
2. **Deploy** to Cloudflare Pages
3. **Migrate** database (if needed)
4. **Notify** on success/failure

### Trigger Deployment

Just push to `main` or `staging`:

```bash
git add .
git commit -m "Deploy new feature"
git push origin main
```

---

## 📝 Update Backend to Use Supabase

Replace your `server.js` to use Supabase client:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.get('/api/places', async (req, res) => {
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('status', 'approved');
    
  if (error) return res.status(500).json(error);
  res.json({ data });
});
```

---

## 🔐 Security Checklist

- ✅ Never commit `.env.local`
- ✅ Store secrets in GitHub Secrets
- ✅ Use Service Role Key only in backend
- ✅ Use Anon Key only in frontend
- ✅ Enable RLS (Row Level Security) in Supabase
- ✅ Rotate API keys monthly

---

## 📊 Architecture

```
┌─────────────────┐
│  GitHub Actions │  (CI/CD)
└────────┬────────┘
         │ (on push)
         ▼
┌─────────────────────────────────────────┐
│         Build & Test                    │
│  - npm install                          │
│  - npm run build                        │
│  - Run tests                            │
└────────┬────────────────────────────────┘
         │
         ├──▶ ┌─────────────────────┐
         │    │ Cloudflare Pages    │  (Frontend)
         │    │ mayheshpo.com       │
         │    └─────────────────────┘
         │
         ├──▶ ┌─────────────────────┐
         │    │ Cloudflare Workers  │  (Backend)
         │    │ api.mayheshpo.com   │
         │    └─────────────────────┘
         │
         └──▶ ┌─────────────────────┐
              │ Supabase            │  (Database)
              │ PostgreSQL          │
              │ Row Level Security  │
              └─────────────────────┘
```

---

## 🚨 Troubleshooting

### Can't connect to Supabase?
- Check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Verify ANON key (not service role key) in frontend
- Check your project is active in Supabase dashboard

### Cloudflare deployment fails?
- Verify `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- Check your R2 bucket is created
- Run `wrangler whoami` to verify login

### Migration failed?
- Ensure Supabase tables exist
- Check `SUPABASE_SERVICE_ROLE_KEY` is correct
- Verify data in `places.json` is valid

---

## 📞 Support

- Supabase Docs: https://supabase.com/docs
- Cloudflare Pages: https://developers.cloudflare.com/pages
- GitHub Actions: https://docs.github.com/en/actions
