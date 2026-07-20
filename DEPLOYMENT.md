# Deployment Guide

Three pieces, three providers:

| Piece | Provider | Repo root points to |
|---|---|---|
| Frontend | Vercel | `frontend/` |
| Backend | Railway (or Render) | `backend/` |
| Database | Supabase (managed PostgreSQL) | — |

This assumes the project is pushed to a single GitHub repo containing both
`frontend/` and `backend/` at the top level (i.e. this zip's structure).

---

## 0. Push to GitHub

```bash
cd project
git init
git add .
git commit -m "Math learning platform MVP"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

---

## 1. Database — Supabase

1. Create a project at https://supabase.com.
2. Project Settings → Database → copy the **connection string** (use the
   "Connection pooling" URI for serverless-friendly platforms like Railway;
   the direct connection URI also works). This is your `DATABASE_URL`.
3. From your local machine (with that `DATABASE_URL` in `backend/.env`),
   run the migration once against the real database:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
   Use `migrate deploy`, not `migrate dev` — `dev` is interactive and
   expects a local shadow database; `deploy` just applies the committed
   migration files, which is what you want against a real environment.

---

## 2. Backend — Railway

1. New Project → **Deploy from GitHub repo** → select this repo.
2. Set the service's **Root Directory** to `backend` (Railway builds the
   whole repo by default; without this it won't find `package.json`).
3. Build/start commands — Railway auto-detects Node via Nixpacks and runs
   `npm install` → `npm run build` → `npm start`, which matches this
   project's scripts (`postinstall` also runs `prisma generate`
   automatically). No custom commands needed.
4. Environment variables (Railway → Variables tab):
   ```
   DATABASE_URL=<from Supabase>
   JWT_SECRET=<a long random string — not the dev default>
   AI_API_KEY=<your Anthropic API key>
   FRONTEND_URL=<your Vercel URL, added after step 3>
   ```
   `FRONTEND_URL` accepts a comma-separated list and `*` wildcards, so one
   backend can serve production plus Vercel preview deployments:
   ```
   FRONTEND_URL=https://your-app.vercel.app,https://*.vercel.app
   ```
   Leave `PORT` unset — Railway injects it automatically, and `main.ts`
   already reads `process.env.PORT`.
5. Deploy, then note the public URL Railway assigns
   (`https://<something>.up.railway.app`) — the frontend needs it next.
6. Sanity check: `curl https://<your-backend>.up.railway.app/health`
   should return `{"success":true,"data":{"status":"ok"},...}`.

*(Render works the same way: New → Web Service → same repo, root
directory `backend`, build command `npm install && npm run build`, start
command `npm start`, same environment variables.)*

---

## 3. Frontend — Vercel

1. Ensure it builds locally first: `cd frontend && npm run build`.
2. Import the GitHub repo in Vercel. Set **Root Directory** to `frontend`.
3. Environment variables (Vercel → Project Settings → Environment Variables):
   ```
   NEXT_PUBLIC_API_URL=https://<your-backend>.up.railway.app
   ```
4. Deploy. Vercel assigns a URL like `https://<something>.vercel.app`.
5. Go back to Railway and set `FRONTEND_URL` (step 2.4) to this exact
   Vercel URL, then redeploy the backend so CORS picks it up.

---

## 4. End-to-end test

Against the deployed Vercel URL:

1. `/register` — create a **teacher** account (username; email optional).
2. Log in → `/teacher/classes` → create a class, note the join code.
3. Add a topic to the class, create an exercise linked to it, then build a
   quiz set on `/teacher/sets` and add the exercise.
4. `/register` a **student** account, join the class with the code on
   `/dashboard`, open the quiz, and complete it — confirm the score,
   XP/streak, and leaderboard render.
5. Answer the same exercise on `/practice` and confirm the AI evaluation
   response renders (correct/incorrect, understanding level, explanation)
   — this also confirms `AI_API_KEY` works end-to-end in production.
6. Toggle light mode on `/settings` and reload — the choice must persist.

If step 3/4 fails with a CORS error in the browser console, double-check
`FRONTEND_URL` on Railway matches the Vercel URL **exactly** (including
`https://`, no trailing slash) and that the backend was redeployed after
setting it.

---

## Required environment variables — reference

**Backend (Railway/Render)**
| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...supabase...` | From Supabase |
| `JWT_SECRET` | long random string | Never reuse the local dev default |
| `AI_API_KEY` | `sk-ant-...` | Anthropic API key |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Exact match, used for CORS |
| `PORT` | — | Leave unset; platform injects it |

**Frontend (Vercel)**
| Variable | Example |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend.up.railway.app` |
