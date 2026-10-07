# ❌ Setup Checklist לפני Deployment

## 1. GitHub Secrets
צריך להגדיר 4 secrets בـ GitHub:

```
https://github.com/idansab/app-base/settings/secrets/actions
```

### Secret 1: CLOUDFLARE_API_TOKEN
```
1. עבור אל: https://dash.cloudflare.com/profile/api-tokens
2. Create Token
3. בחר "Edit Cloudflare Workers"
4. ודא הרשאות: 
   - Account.Workers Scripts - Edit
   - Account.Pages - Edit
5. העתק את ה-Token
6. הדבק בGitHub Secret כ-CLOUDFLARE_API_TOKEN
```

### Secret 2: CLOUDFLARE_ACCOUNT_ID
```
כבר בקובץ wrangler.toml:
2bf9335eb4120606b6337d0442cb902e
```

### Secret 3: SUPABASE_URL
```
https://gsbbtrknnkdihdlojwbd.supabase.co
```

### Secret 4: SUPABASE_SERVICE_ROLE_KEY
```
1. עבור אל: https://app.supabase.com/project/_/settings/api
2. העתק את "service_role" key (לא anon key!)
3. הדבק בGitHub Secret
```

---

## 2. Repository Setup
```bash
# וודא שאתה ב-main branch
git checkout main

# דחוף את כל השינויים
git push origin main
```

---

## 3. Deploy Flow
```
main branch → GitHub Actions:
  1. build-and-test (npm run build)
  2. deploy-to-cloudflare (wrangler deploy)
  3. migrate-database (verify Supabase connection)
  4. notify-deployment (log success)
```

---

## 4. Monitor Deployment
```
1. עבור אל: https://github.com/idansab/app-base/actions
2. בחר את ה-workflow
3. ראה את ה-logs בזמן אמת
```

---

## 5. Test Production
```
בקר בـ:
- https://mayheshpo.com (Production)
- https://staging.mayheshpo.com (Staging)
```

---

## ⚠️ Security Notes

❌ **NEVER commit:**
- .env.local
- Secrets/API keys
- Service Role Keys

✅ **Use GitHub Secrets for:**
- SUPABASE_SERVICE_ROLE_KEY
- CLOUDFLARE_API_TOKEN
- Any production credentials

