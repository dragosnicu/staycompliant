# StayCompliant 🏠
**Permit & compliance tracker for short-term rental hosts**

---

## Deploy to Railway in 6 steps

### Before you start, have these ready:
- GitHub account
- Railway account (railway.app — sign up free with GitHub)
- Supabase DATABASE_URL (from supabase.com → Settings → Database → URI)

---

### Step 1 — Push to GitHub

Create a new repo at github.com, then run in your project folder:

```
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/staycompliant.git
git push -u origin main
```

---

### Step 2 — Run the database schema

1. Go to your Supabase project → SQL Editor → New query
2. Paste the entire contents of `server/db/schema.sql`
3. Click Run ✓

---

### Step 3 — Deploy the backend on Railway

1. Go to railway.app → New Project → Deploy from GitHub repo
2. Select `staycompliant`
3. When asked for root directory → type: `server`
4. Go to Variables tab and add:

```
DATABASE_URL      = (your Supabase URI)
JWT_SECRET        = (any long random string)
RESEND_API_KEY    = (from resend.com — free)
EMAIL_FROM        = (verified sender email in Resend)
NODE_ENV          = production
```

5. Copy your backend's public URL — looks like `xyz.up.railway.app`

---

### Step 4 — Deploy the frontend on Railway

1. In the same Railway project → New Service → GitHub Repo → same repo
2. Root directory → type: `client`
3. Variables tab → add:

```
VITE_API_URL = https://xyz.up.railway.app   ← your backend URL from Step 3
```

4. Deploy. Copy the frontend URL — this is your app! 🎉

---

### Step 5 — Add CLIENT_URL to backend

Go back to your backend Railway service → Variables → add:

```
CLIENT_URL = https://your-frontend.up.railway.app
```

This enables CORS so your frontend can talk to the backend.

---

### Step 6 — Test it

1. Open your frontend URL
2. Register an account
3. Add a property + permit
4. You're live ✓

---

## Redeploy after changes

```
git add .
git commit -m "update"
git push
```

Railway auto-deploys on every push.

---

## Local development (optional)

```
# Terminal 1
cd server
npm install
copy .env.example .env    (fill in values)
npm run dev

# Terminal 2
cd client
npm install
npm run dev
```

App runs at http://localhost:5173
