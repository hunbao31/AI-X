# EduAI — AI Education Platform

An AI-powered all-in-one learning platform combining classroom management
(Google Classroom), quiz sets (Kahoot), mastery tracking (Khan Academy),
gamification (Duolingo), and adaptive recommendations.

Two independent apps, no monorepo tooling:

- `frontend/` — Next.js 14 (App Router, TypeScript, Tailwind v4, Framer Motion)
- `backend/`  — NestJS 10 + Prisma 5 + PostgreSQL. Requires **Node.js 18+**
  (uses the global `fetch`/`AbortController`, no HTTP client library).

## Domain model

| Domain | Models | Notes |
|---|---|---|
| Users | `User` | Roles: `student` / `teacher` / `admin`. Login by **username or email** (email optional). Per-user `theme` (light/dark). |
| Classroom | `Class`, `ClassMember` | Teacher creates a class → 6-char join code → students join. |
| Topics | `Topic` | Teacher-defined, class-scoped. Exercises can link to one via `topicId`. |
| Exercises | `Exercise` | MCQ or free text; editable (`PATCH`); optional class-topic link. |
| Quiz sets | `ExerciseSet`, `ExerciseSetItem`, `QuizAttempt` | Kahoot-style ordered sets, per-question timer, server-side grading, leaderboard. `roomCode` field reserved for future realtime lobbies. Questions are authored directly into a set (`POST /sets/:id/questions`) and belong to their creator (`Exercise.createdBy`) — a personal bank, not a shared pool. `isPublic` sets are browsable in the marketplace; importing one deep-clones both the set and its questions into the importer's own ownership. |
| Progression | `Mastery`, `Attempt` | Per-topic mastery 0–100, every answer recorded. |
| Gamification | `Gamification` | XP (+10 correct / +3 incorrect), levels (100 XP each), daily streaks. |
| Forum | `ForumPost`, `ForumAnswer`, `ForumAnswerUpvote` | Image Q&A, StackOverflow-style. Answering (+10 XP), upvotes received (+5 XP, un-upvote retracts it), accepted answer (+50 XP, one per post). Visibility: public (no class) or class-members-only. `answerCount`/`rewardScore`/`hasAcceptedAnswer` denormalized onto the post for cheap feed sorting. |

**Privacy**: quiz sets are `public`, class-only (visible to members), or
private (creator only) — enforced server-side, and students never receive
answer fields while playing.

## API surface (all under `/api/v1`)

```
POST  /auth/register              {username, email?, password, role?}
POST  /auth/login                 {identifier|username|email, password}
GET   /users/me
PATCH /users/me/settings          {theme: "light"|"dark"}

POST  /classes                    (teacher) create, returns join code
POST  /classes/join               {code}
GET   /classes                    my classes
GET   /classes/:id                detail (members, topics, sets) — members only

POST  /topics                     (teacher) {name, classId}
GET   /topics?classId=...         (members)

POST  /exercises                  (teacher) supports topicId link + tags
POST  /exercises/import           (teacher) bulk CSV {csv, topicId|topic, difficulty?}
                                  → {created, failed, errors[]} (invalid rows skipped)
GET   /exercises?topic=&topicId=&difficulty=&type=&tag=&search=
GET   /exercises/mine             (teacher) only the exercises I authored — same filters as above
GET   /exercises/:id
PATCH /exercises/:id              (owner) edit any field
DELETE /exercises/:id             (owner)
GET   /exercises/stats            (teacher)

POST  /sets                       (teacher) {title, description?, classId?, isPublic?,
                                  mode? (practice|exam), timeLimitPerQuestion?}
GET   /sets                       visible sets (mine + public + my classes; drafts owner-only)
GET   /sets/:id                   playable detail (answers stripped for students)
PATCH /sets/:id                   (owner) incl. mode switch
POST  /sets/:id/add-exercise      (owner) {exerciseId}
DELETE /sets/:id/exercises/:exerciseId
POST  /sets/:id/questions         (owner) inline-author a question straight into the set —
                                  {question, optionA, optionB, optionC?, optionD?,
                                  correctAnswer, difficulty?} — also lands in your personal
                                  bank (GET /exercises/mine), same resolver CSV import uses
PATCH /sets/:id/reorder           (owner) {exerciseIds: [...]} persist drag-and-drop order
DELETE /sets/:id                  (owner) removes the set only — questions stay in your bank
GET   /sets/marketplace           published public sets: ?search=&page=&limit=
                                  → paginated {data, meta:{page,limit,hasMore}}
POST  /sets/:id/import            (teacher) {classId?} deep-clones a public set — new Exercise
                                  rows too, so the importer's copy is fully independent and
                                  freely editable without touching the original
POST  /sets/:id/check             {exerciseId, answer, code?} → instant feedback (practice only)
POST  /sets/:id/start             {code?} → create/resume in-progress attempt (auto-save anchor)
PATCH /sets/attempts/:id/progress {answers, lastQuestionIndex} auto-save
POST  /sets/:id/submit            {answers:[{exerciseId, answer, timeMs?}], attemptId?,
                                  durationSeconds?, code?} → graded + XP with speed/combo
                                  bonuses (exam mode: correct answers withheld)
POST  /sets/:id/duplicate         (owner) {title?, classId?} clone, optionally into a class
GET   /sets/:id/export            (owner) CSV download, importer-compatible
GET   /sets/by-code/:code         resolve a private access code → set id
POST  /sets/quick-start           random topic + difficulty-scaled random questions
POST  /sets/quick-start/submit    grade a quick quiz (stateless, XP still counts)
GET   /sets/:id/leaderboard       best quiz score per user

GET   /leaderboard/global         top students by XP
GET   /leaderboard/class/:classId class members by XP (members only)

GET   /favorites | /favorites/ids
POST  /favorites/:exerciseId      save a question   DELETE → unsave
GET   /users/me/continue          newest unfinished quiz (resume point)
GET   /users/me/quiz-history      completed attempts
GET   /users/me/recent-activity   last quiz + last topic
GET   /gamification               xp/level/streak + computed badges
GET   /analytics/questions        (teacher) most-missed questions
GET   /analytics/sets             (teacher) avg score + avg time per set

POST  /attempts                   single-exercise practice (AI-evaluated)
GET   /mastery                    my per-topic mastery
GET   /gamification               xp / level / streak
GET   /analytics                  overall summary
GET   /analytics/topics           per-topic correct rate + attempts
GET   /recommendation             overall next step
GET   /recommendation/topics      per-topic repeat / practice / advance

POST  /forum/posts                multipart {image, description?, topicId?|classId?}
GET   /forum/posts                feed: ?sort=newest|most_answered|most_rewarded&page=&limit=
GET   /forum/posts/:id            full detail incl. answers[] (upvotedByMe per answer)
POST  /forum/answers              multipart {postId, content, image?} → +10 XP
POST  /forum/answers/:id/upvote   toggle; +5/-5 XP to the answer's author (never yourself)
POST  /forum/answers/:id/accept   asker or teacher only → +50 XP, one accepted answer/post
```

Every response uses the `{success, data, meta}` envelope; errors are
`{success: false, error: {code, message}, meta}`.

## Setup

### Backend
```
cd backend
npm install                # also runs `prisma generate` via postinstall
cp .env.example .env       # set DATABASE_URL (+ JWT_SECRET, AI_API_KEY)

npx prisma migrate deploy  # applies committed migrations
npm run start:dev
```
Runs at http://localhost:8080 — check http://localhost:8080/health

**Database**: needs a running PostgreSQL instance reachable at `DATABASE_URL`.
Easiest local option:
```
docker run --name eduai-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=math_platform -p 5432:5432 -d postgres:16
```
Or a free hosted PostgreSQL (Neon / Supabase / Prisma Postgres).

### Migration notes

Migrations live in `backend/prisma/migrations` and are ordered:

1. `..._init` — original schema (User, Exercise, Attempt, Mastery, Gamification).
2. `..._platform_upgrade` — classes/topics/sets + user upgrade. Hand-written
   and **data-safe on existing databases**: it adds `User.username` as
   nullable, backfills it from `email`, then locks it down as `NOT NULL
   UNIQUE`, and makes `email` optional. Nothing is dropped.

- Fresh or existing DB: `npx prisma migrate deploy` (non-interactive, applies
  what's pending — this is also what CI/production should run).
- Local development with a shadow DB: `npx prisma migrate dev` also works.
- Pre-upgrade accounts keep working: their username is their email address,
  so they log in exactly as before (and can also keep using the email field).
- Old JWTs (without a `username` claim) are rejected with
  `Session is outdated — please log in again.` — users just log in once more.

### Frontend
```
cd frontend
npm install
cp .env.example .env.local
npm run dev
```
Runs at http://localhost:3000

## Frontend pages

```
/                             landing page (logged-out only — logged-in users are
                             redirected straight to their dashboard)
/login, /register            username (+ optional email) auth, theme toggle
/dashboard                   student home: progress, join class by code,
                             Class → Topic → Quiz picker (nothing auto-starts)
/practice[?topic=...]        topic practice with explicit Start gate
/quizzes                     visible quiz sets
/quiz/[id]                   quiz player: intro → timed questions → results
                             + review + leaderboard
/settings                    theme toggle (dark/light) + account info

/teacher/dashboard           stats + quick links
/teacher/classes[/id]        create class, join code, members, topics
/teacher/create              create a standalone exercise (optional class-topic link);
                             not linked from the nav — inline authoring in the set
                             builder is the primary path now
/teacher/manage              "My Question Bank" — list / edit / delete my own exercises
/teacher/exercises/[id]/edit edit form (PATCH)
/teacher/sets[/id]           create sets; build questions directly in the set (add,
                             edit, delete, drag-and-drop reorder), publish/unpublish,
                             delete the set, timer, leaderboard
/teacher/marketplace         browse public sets from other teachers, search, import
                             a deep-cloned copy into your own bank
/teacher/settings            same settings panel
```

Theming: dark is the default; light mode is applied via an `html.light`
class (per-account preference, synced through `PATCH /users/me/settings`).

Math: questions/options/explanations render LaTeX via **KaTeX** — `$...$`
inline, `$$...$$` block (`components/ui/MathText.tsx`). Content is stored as
raw LaTeX strings; invalid LaTeX falls back to plain text. CSV import passes
LaTeX through verbatim — see [`sample-questions.csv`](./sample-questions.csv).

## Status

Production-ready MVP — see [`DEPLOYMENT.md`](./DEPLOYMENT.md) for the
Vercel (frontend) / Railway (backend) / managed-PostgreSQL runbook and
required environment variables. Realtime quiz rooms (`roomCode`,
leaderboard, timer fields) are modeled but the socket layer is not built
yet. The legacy `/curriculum` + `/exercise` demo pages remain for
backward compatibility.
