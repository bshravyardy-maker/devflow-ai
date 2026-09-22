# DevFlow AI — Developer Productivity Dashboard

DevFlow AI is a complete full-stack developer project and task management platform with an integrated AI Task Generator.

## Features

- **Authentication**: JWT-based login and registration.
- **Projects**: Create, edit, delete, and view development projects with progress tracking.
- **Tasks**: Create, edit, assign, delete, and manage tasks with statuses, priorities, and due dates.
- **Dashboard**: High-level overview of projects, tasks, and recent activity.
- **AI Task Generator**: Describe a project goal, and Google Gemini AI will generate actionable tasks you can instantly add to your project.
- **Task Assignment**: Assign tasks to any registered user, filter tasks by assignee, and see assignee badges on task cards.
- **AI Weekly Digest**: A rolling 7-day recap of tasks completed/created and projects touched, with an optional Gemini-written narrative summary.
- **AI Focus Coach**: Ranks your open tasks by priority, status and due date (overdue, due soon) and, on request, asks Gemini for a short coaching note.
- **Analytics**: Task status and priority distribution, project progress, overdue / due-this-week counts and tasks created over the last 14 days.
- **AI Project Health**: Every project page shows a 0-100 health score with risk flags (overdue, stale, unstarted high-priority work) and can ask Gemini for a written status report with next steps.
- **Focus Timer**: Pomodoro-style sessions (15/25/45/60 min) that can be tied to a task, with daily totals, a streak counter and your most-focused tasks.
- **Settings**: Light/dark theme (saved in the browser), change password and log out.
- **Responsive UI**: Clean, modern SaaS design that works on desktop, tablet, and mobile.

## Technology Stack

**Frontend**:
- Next.js (App Router)
- TypeScript
- Tailwind CSS

**Backend**:
- FastAPI (Python)
- SQLAlchemy (ORM)
- Pydantic (Data validation)
- SQLite (Local DB)
- JWT (Authentication)

**AI**:
- Google Gemini API (`gemini-3.5-flash`)

## Architecture

```
Browser 
  ↓ (REST / JSON)
Next.js Frontend 
  ↓ (HTTP Requests)
FastAPI REST API
  ↓ (SQLAlchemy)
SQLite Database
```
The FastAPI backend also communicates directly with the Gemini API to generate tasks securely.

## Folder Structure

```
devflow-ai/
├── backend/          # FastAPI Python application
│   ├── app/          # Main application code (models, schemas, routers)
│   ├── .env          # Backend environment variables
│   └── requirements.txt
├── frontend/         # Next.js React application
│   ├── app/          # App router pages and layouts
│   ├── components/   # Reusable UI components
│   ├── lib/          # API client and utility functions
│   └── .env.local    # Frontend environment variables
├── .env.example      # Example environment variables
└── README.md
```

## Database Schema Overview

- **User**: Authentication details and basic profile.
- **Project**: Represents a high-level project with a status and completion percentage.
- **Task**: Represents a specific work item belonging to a project, with status, priority, and due date.
- **Activity**: Audit log of actions performed by users.

## API Endpoints

- `POST /api/auth/register` - Create an account
- `POST /api/auth/login` - Authenticate and get JWT
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update profile
- `PUT /api/users/me/password` - Change password
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create a project
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project (and its tasks)
- `GET /api/tasks` - List/search/filter tasks
- `POST /api/tasks` - Create a task
- `GET /api/tasks/{id}` - Get task details
- `PUT /api/tasks/{id}` - Update a task
- `DELETE /api/tasks/{id}` - Delete a task
- `GET /api/dashboard` - Get dashboard statistics
- `GET /api/users` - List all registered users (used for the assignee picker)
- `GET /api/dashboard/analytics` - Analytics (distributions, project progress, overdue)
- `POST /api/ai/generate-tasks` - Generate tasks with Gemini
- `POST /api/ai/add-tasks` - Add generated tasks
- `GET /api/ai/digest` - AI weekly digest (`?days=N&narrate=true` for a Gemini recap)
- `GET /api/ai/project-health/{project_id}` - Project health score (`?report=true` adds a Gemini status report)
- `POST /api/focus/sessions` - Log a completed focus session
- `GET /api/focus/summary` - Focus totals, streak and top tasks
- `GET /api/ai/focus-coach` - Ranked focus tasks (`?advice=true` adds a Gemini coaching note)

## Optional demo data

To fill the app with 6 sample projects (~9-12 tasks each, some assigned to a second demo teammate account) plus focus sessions, run this from `backend/` with the venv active:

```bash
python seed_demo.py you@email.com
```

Delete the project "Demo: Product Launch" in the app to remove it again.

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=sqlite:///./devflow.db
SECRET_KEY=devflow-secret-key-for-development-only
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GEMINI_API_KEY=your_gemini_api_key_here
```

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Setup & Running Locally

### 1. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

### 3. Run the Backend

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
The database will be automatically created on startup.

### 4. Run the Frontend

```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

## Gemini Setup

To use the AI Task Generator feature, you must set the `GEMINI_API_KEY` in `backend/.env`. 
Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
If the key is missing, the backend will gracefully return a `503 Service Unavailable` error when trying to generate tasks.

## Deployment Notes

- **Database**: Change `DATABASE_URL` to a PostgreSQL connection string for production.
- **Security**: Change `SECRET_KEY` to a strong random string.
- **Frontend**: Build the Next.js app with `npm run build` and serve it, or deploy to Vercel/Netlify. Ensure `NEXT_PUBLIC_API_URL` points to your production backend URL.
