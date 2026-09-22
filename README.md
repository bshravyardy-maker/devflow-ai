# DevFlow AI

**An AI-powered developer project & task management platform.** Built for Innovation Hacks — Task 4.

DevFlow AI combines authentication, project/task management, analytics, and four distinct Gemini-powered AI features into one full-stack app: a FastAPI backend, a Next.js frontend, and SQLite for storage.

---

## ✨ Features

### Core

- **Authentication** — JWT-based register, login, logout, and protected routes.
- **Dashboard** — project overview, task statistics, progress tracking, and a recent activity feed.
- **Projects** — create, edit, delete, and view project details with live progress bars.
- **Tasks** — create, edit, delete; set status, priority, and due dates; assign to a user; search and filter.
- **Task Assignment** — assign any task to a registered user, filter the task list by assignee, and see assignee badges on task cards.
- **Analytics** — status/priority distribution, per-project progress, overdue and due-this-week counts, and a 14-day task-creation trend.
- **Settings** — light/dark theme, change password, log out.

### AI-powered (Google Gemini)

DevFlow AI implements four AI features, well beyond the one required by the brief:

| Feature | What it does |
|---|---|
| **AI Task Generator** | Describe a project goal — Gemini returns 10–15 specific, non-duplicated, logically ordered tasks. You review and pick which ones to add. |
| **AI Focus Coach** | Ranks your open tasks by urgency (overdue, due soon, priority, in-progress) and can ask Gemini for a short coaching note on what to tackle first. |
| **AI Project Health** | A 0–100 health score per project from real signals (overdue tasks, stale to-dos, unstarted high-priority work), with an optional Gemini-written status report and next steps. |
| **AI Weekly Digest** | A rolling 7-day recap of what got done, with an optional Gemini narrative summary — task/activity summarization. |

Every AI feature validates Gemini's output against a Pydantic schema, requests strict JSON (no markdown/code fences), and degrades gracefully (clear error messages, no stack traces) if the API key is missing, invalid, rate-limited, or times out.

### Bonus

- **Focus Timer** — Pomodoro-style sessions (15/25/45/60 min), optionally tied to a task, with daily totals, a streak counter, and your most-focused tasks.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python), SQLAlchemy, Pydantic, JWT auth |
| Database | SQLite (swap `DATABASE_URL` for PostgreSQL in production) |
| AI | Google Gemini API (`gemini-3.5-flash`) |

## 🏗 Architecture

```
Browser
  ↓ REST / JSON
Next.js Frontend
  ↓ HTTP
FastAPI Backend  ──────→  Google Gemini API
  ↓ SQLAlchemy
SQLite Database
```

The Gemini API key lives only in the backend's environment — it is never sent to the frontend, logged, or exposed in error messages.

## 📁 Project Structure

```
final/
├── backend/                  FastAPI application
│   ├── app/
│   │   ├── models.py         SQLAlchemy models (User, Project, Task, Activity, FocusSession)
│   │   ├── schemas.py        Pydantic request/response schemas
│   │   ├── auth.py           JWT auth, password hashing
│   │   ├── focus.py          Rule-based task urgency scoring
│   │   ├── health.py         Rule-based project health scoring
│   │   └── routers/          auth, users, projects, tasks, dashboard, ai, focus_sessions
│   ├── seed_demo.py          Optional: generates 6 demo projects (~58 tasks)
│   ├── test_ai.py            End-to-end smoke test (real backend + Gemini call)
│   ├── requirements.txt
│   └── .env                  Backend environment variables (not committed)
├── frontend/                 Next.js application
│   ├── app/                  App Router pages (dashboard, projects, tasks, analytics, focus, settings)
│   ├── components/           Reusable UI + feature components (AI cards, forms, layout)
│   ├── lib/                  API client (lib/api.ts) and utilities
│   └── .env.local            Frontend environment variables (not committed)
├── .env.example
└── README.md
```

## 🗄 Database Schema

| Model | Purpose |
|---|---|
| `User` | Account and auth details |
| `Project` | A project owned by a user, with a status |
| `Task` | Belongs to a project; has status, priority, due date, and optional assignee |
| `Activity` | Audit log of actions (created/updated/completed/assigned tasks, etc.) |
| `FocusSession` | A logged Pomodoro session, optionally linked to a task |

## 🔌 API Reference

**Auth**
- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — authenticate, get a JWT

**Users**
- `GET /api/users` — list registered users (assignee picker)
- `GET /api/users/me` / `PUT /api/users/me` — profile
- `PUT /api/users/me/password` — change password

**Projects**
- `GET|POST /api/projects`, `GET|PUT|DELETE /api/projects/{id}`

**Tasks**
- `GET|POST /api/tasks`, `GET|PUT|DELETE /api/tasks/{id}` — supports `status`, `priority`, `assignee_id`, `project_id`, `search`, `sort_by`/`sort_order` query params

**Dashboard & Analytics**
- `GET /api/dashboard` — overview stats
- `GET /api/dashboard/analytics` — distributions, project progress, overdue/due-this-week

**AI**
- `POST /api/ai/generate-tasks` — generate 10–15 tasks from a project goal
- `POST /api/ai/add-tasks` — save selected generated tasks
- `GET /api/ai/focus-coach?advice=true` — ranked focus tasks + optional Gemini note
- `GET /api/ai/project-health/{project_id}?report=true` — health score + optional Gemini report
- `GET /api/ai/digest?days=7&narrate=true` — activity recap + optional Gemini summary

**Focus Timer**
- `POST /api/focus/sessions` — log a completed session
- `GET /api/focus/summary` — totals, streak, top tasks

## ⚙️ Environment Variables

`backend/.env`:
```env
DATABASE_URL=sqlite:///./devflow.db
SECRET_KEY=devflow-secret-key-for-development-only
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=your_gemini_api_key_here
```

`frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

`GEMINI_API_KEY` lives only in `backend/.env`, is never committed (see `.gitignore`), never sent to the frontend, and never appears in logs.

## 🚀 Getting Started

**Prerequisites:** Python 3.11+, Node.js 18+, a [Gemini API key](https://aistudio.google.com/app/apikey) (free tier is fine).

```bash
# 1. Clone
git clone <your-repo-url>
cd final

# 2. Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env            # then edit .env and add your Gemini key
python -m uvicorn app.main:app --reload --port 8000

# 3. Frontend (in a new terminal)
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
npm run dev
```

Open **http://localhost:3000**, register an account, and you're in.

### Optional: load demo data

Fills the account with 6 projects and ~58 tasks in every state (done, in progress, overdue, due soon, stale, unassigned), plus a second "teammate" account for testing task assignment:

```bash
cd backend
source .venv/bin/activate
python seed_demo.py you@email.com
```

### Optional: run the smoke test

Exercises the real backend end-to-end (health check, auth, AI task generation with a live Gemini call, saving, focus coach, project health, digest, and task assignment):

```bash
cd backend
source .venv/bin/activate
python test_ai.py
```

## ☁️ Deployment Notes

- **Database:** swap `DATABASE_URL` for a managed Postgres connection string (e.g. on Render/Railway).
- **Security:** replace `SECRET_KEY` with a strong random value; never reuse the development one.
- **Backend:** deploy the FastAPI app to Render/Railway; set `GEMINI_API_KEY` and `SECRET_KEY` as environment variables in the platform's dashboard, not in code.
- **Frontend:** `npm run build`, then deploy to Vercel/Netlify; set `NEXT_PUBLIC_API_URL` to your deployed backend's URL.

## 📄 License

_Add a license if required by Innovation Hacks (e.g. MIT), or state "For educational purposes as part of the Innovation Hacks internship."_

---

Built for the **Innovation Hacks** Full-Stack Development Internship — Task 4.
