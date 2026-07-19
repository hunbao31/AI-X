# Math Learning Platform — MVP Scaffold

Two independent apps, no monorepo tooling yet (kept simple per Step 1):

- `frontend/` — Next.js 14 (App Router, TypeScript)
- `backend/`  — NestJS 10 (TypeScript). Requires **Node.js 18+** (uses the global `fetch`/`AbortController`, no HTTP client library).

## Setup

### Backend
```
cd backend
npm install                # also runs `prisma generate` via postinstall
cp .env.example .env
# set AI_API_KEY in .env to enable real evaluation — without it, /attempts
# automatically falls back to the mock evaluator, no crash either way.

# set DATABASE_URL in .env, then create tables:
npx prisma migrate dev --name init

npm run start:dev
```
Runs at http://localhost:8080 — check http://localhost:8080/health

**Database**: needs a running PostgreSQL instance reachable at `DATABASE_URL`.
Easiest local option:
```
docker run --name math-platform-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=math_platform -p 5432:5432 -d postgres:16
```
Or use a free [Supabase](https://supabase.com) / [Prisma Postgres](https://www.prisma.io/postgres) project and paste its connection string into `DATABASE_URL`.

This project pins Prisma to the 7.x line, which requires a driver adapter
(`@prisma/adapter-pg`) and a `prisma.config.ts` file — noticeably different
from older Prisma 5/6 tutorials. If `npx prisma migrate dev` errors out,
check the exact installed version against
https://www.prisma.io/docs/orm/overview/databases/postgresql.

### Frontend
```
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Runs at http://localhost:3000

## Status

Step 12: production-ready for deployment — see [`DEPLOYMENT.md`](./DEPLOYMENT.md)
for the full Vercel (frontend) / Railway (backend) / Supabase (database)
runbook and required environment variables. `User`, `Attempt`, `Mastery`,
and `Gamification` persist in PostgreSQL via Prisma (Step 11). Curriculum
content is still an in-memory array. No indexing or caching optimization
yet.
