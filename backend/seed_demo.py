"""Optional: fill an account with realistic demo data - 6 projects, ~12-16 tasks each
(some assigned to a second demo teammate), plus activity history and focus sessions.

Usage (from the backend folder, with the venv active):
    python seed_demo.py                 # uses the first account in the database
    python seed_demo.py you@email.com   # uses that account

Safe to run more than once: it skips any demo project that already exists for that user.
To remove the demo data, delete the "Demo:" projects in the app - their tasks, activity
and focus sessions are deleted with them.
"""
import sys
from datetime import date, datetime, timedelta

from app import models
from app.database import SessionLocal, engine
from app.auth import hash_password

TEAMMATE_EMAIL = "teammate.demo@example.com"
TEAMMATE_NAME = "Jordan (demo teammate)"
TEAMMATE_PASSWORD = "password123"

# Each project: (name, description, [(title, description, status, priority, due_in_days, created_days_ago, assign_to_teammate), ...])
PROJECTS = [
    ("Demo: Product Launch", "Ship the v1 product launch: backend, frontend, and go-to-market.", [
        ("Set up repository and CI pipeline", "Create the repo, branch rules and a CI workflow that runs lint and tests on every push.", "done", "high", -20, 30, False),
        ("Design database schema", "Model users, projects, tasks and activity with the right relationships and constraints.", "done", "high", -18, 29, False),
        ("Implement authentication API", "Register, login and protected routes using JWT and hashed passwords.", "done", "high", -15, 25, True),
        ("Build project dashboard UI", "Stat cards, project progress bars and recent activity feed.", "done", "medium", -12, 22, True),
        ("Create task CRUD endpoints", "REST endpoints to create, read, update and delete tasks with ownership checks.", "in_progress", "high", -2, 15, False),
        ("Add search and filters to tasks page", "Filter by status, priority, assignee and project, plus free-text search.", "in_progress", "medium", 1, 10, True),
        ("Write API integration tests", "Cover auth, projects and tasks endpoints including 401/404 error cases.", "todo", "high", 2, 8, False),
        ("Integrate Gemini task generator", "Call Gemini from the backend, validate the JSON and let users review tasks before saving.", "todo", "medium", 4, 7, False),
        ("Add analytics charts", "Status and priority distribution plus project progress on an Analytics page.", "todo", "medium", 6, 5, True),
        ("Set up error monitoring and logging", "Structured logs and alerting for backend errors without leaking secrets.", "todo", "low", None, 20, False),
        ("Prepare demo video and README", "Record a walkthrough and document setup, features and API endpoints.", "todo", "medium", 9, 3, False),
        ("Write deployment guide", "Explain how to deploy the frontend and backend and configure environment variables.", "todo", "low", 12, 2, False),
    ]),
    ("Demo: Mobile App Redesign", "Refresh the mobile app's UI and improve onboarding conversion.", [
        ("Audit current onboarding funnel", "Review drop-off points using existing analytics events.", "done", "high", -14, 20, False),
        ("Create new design system tokens", "Colors, spacing and typography scale shared across screens.", "done", "medium", -10, 18, True),
        ("Redesign sign-up screen", "Simplify fields and add social sign-in buttons.", "done", "high", -7, 16, True),
        ("Redesign home feed layout", "Card-based layout with clearer visual hierarchy.", "in_progress", "high", -1, 12, False),
        ("Add skeleton loading states", "Replace spinners with skeleton screens on slow connections.", "in_progress", "low", 3, 9, True),
        ("Update empty states illustrations", "Friendlier empty states for search, inbox and history.", "todo", "low", 8, 6, False),
        ("Accessibility pass on new screens", "Check color contrast, tap targets and screen-reader labels.", "todo", "medium", 5, 4, False),
        ("Set up A/B test for new onboarding", "Roll out to 20% of new users and track completion rate.", "todo", "high", 10, 3, False),
        ("QA regression on Android", "Run the full manual test suite on 3 device sizes.", "todo", "medium", 7, 2, True),
        ("Write release notes", "Summarize changes for the app store listing.", "todo", "low", 15, 1, False),
    ]),
    ("Demo: Internal Analytics Pipeline", "Build a nightly pipeline to aggregate product usage metrics.", [
        ("Define key metrics with stakeholders", "Agree on activation, retention and engagement definitions.", "done", "high", -25, 28, False),
        ("Set up raw event ingestion", "Land raw events into the warehouse via a streaming job.", "done", "high", -20, 26, True),
        ("Build daily aggregation job", "Scheduled job that rolls up events into daily metric tables.", "done", "medium", -16, 24, False),
        ("Add data quality checks", "Alert when a day's row count is far outside the normal range.", "in_progress", "high", -3, 14, False),
        ("Build metrics dashboard", "Internal dashboard for the daily/weekly rollups.", "in_progress", "medium", 2, 11, True),
        ("Document metric definitions", "A wiki page explaining exactly how each metric is computed.", "todo", "low", None, 18, False),
        ("Add cost monitoring for the pipeline", "Track warehouse compute cost per job run.", "todo", "low", 14, 5, False),
        ("Backfill historical data", "Reprocess the last 6 months of raw events into the new tables.", "todo", "high", 6, 4, False),
        ("Set up on-call alerting", "Page the on-call engineer if a nightly job fails twice in a row.", "todo", "medium", 9, 3, True),
        ("Review pipeline with security", "Confirm PII handling meets the data retention policy.", "todo", "medium", 11, 2, False),
        ("Load test the aggregation job", "Verify it still finishes within the nightly window at 3x volume.", "todo", "low", 20, 1, False),
    ]),
    ("Demo: Customer Support Portal", "Self-service portal so customers can raise and track support tickets.", [
        ("Design ticket data model", "Tickets, statuses, comments and attachments.", "done", "high", -19, 21, False),
        ("Build ticket creation form", "Category, priority, description and file attachment fields.", "done", "medium", -14, 19, True),
        ("Build ticket list and detail view", "Customers can see their own tickets and status history.", "done", "medium", -9, 17, False),
        ("Add email notifications on status change", "Notify the customer when a ticket is updated or resolved.", "in_progress", "medium", 0, 9, True),
        ("Add internal agent assignment", "Let support agents claim and reassign tickets.", "in_progress", "high", -1, 8, False),
        ("Build canned response templates", "Common replies agents can insert with one click.", "todo", "low", 7, 6, False),
        ("Add customer satisfaction survey", "Short survey sent after a ticket is closed.", "todo", "low", 13, 4, False),
        ("Set up SLA breach alerts", "Flag tickets that are close to breaching their response SLA.", "todo", "high", 3, 3, True),
        ("Write agent onboarding guide", "Documentation for new support hires.", "todo", "low", 16, 2, False),
    ]),
    ("Demo: API Rate Limiting & Security Hardening", "Harden the public API before opening it to third-party developers.", [
        ("Add per-key rate limiting", "Token-bucket rate limiting keyed by API key.", "done", "high", -11, 15, False),
        ("Rotate and scope API keys", "Move from one shared key to scoped, revocable keys.", "done", "high", -8, 13, True),
        ("Add request signing", "HMAC-signed requests to prevent tampering and replay.", "in_progress", "high", -2, 10, False),
        ("Add audit log for admin actions", "Track who changed what and when in the admin panel.", "in_progress", "medium", 1, 7, False),
        ("Pen-test the public endpoints", "Third-party security review before general availability.", "todo", "high", 5, 5, True),
        ("Publish API changelog", "Public changelog so integrators can track breaking changes.", "todo", "low", 10, 3, False),
        ("Add IP allowlisting option", "Optional allowlist for enterprise customers.", "todo", "low", 18, 1, False),
        ("Write third-party developer docs", "Getting-started guide and endpoint reference.", "todo", "medium", 8, 2, True),
    ]),
    ("Demo: Marketing Website Revamp", "Refresh the public marketing site and improve page speed.", [
        ("Audit current site performance", "Lighthouse scores and Core Web Vitals baseline.", "done", "medium", -13, 16, False),
        ("Redesign homepage hero section", "New headline, imagery and clearer call-to-action.", "done", "medium", -9, 14, True),
        ("Rebuild pricing page", "Clearer plan comparison and FAQ section.", "in_progress", "high", -1, 9, False),
        ("Optimize images and fonts", "Convert to modern formats and add proper caching headers.", "in_progress", "low", 2, 6, True),
        ("Add customer logos and testimonials", "Social proof section on the homepage.", "todo", "low", 11, 4, False),
        ("Set up A/B testing on CTA copy", "Test two variants of the main call-to-action button.", "todo", "medium", 6, 3, False),
        ("Improve mobile navigation menu", "Simplify the mobile hamburger menu structure.", "todo", "medium", 4, 2, True),
        ("Add blog RSS feed", "Expose an RSS feed so the blog can be syndicated.", "todo", "low", 20, 1, False),
    ]),
]

# (project_index, task_index_within_project, minutes, days_ago)
SESSIONS = [
    (0, 4, 25, 0), (0, 4, 25, 0), (0, 5, 50, 1), (0, 2, 25, 2), (0, 2, 25, 2), (0, 3, 45, 3), (0, 0, 25, 5),
    (1, 3, 30, 0), (1, 3, 25, 1), (2, 3, 45, 0), (2, 4, 25, 2), (3, 3, 25, 1), (4, 2, 50, 0),
]


def _get_or_create_teammate(db) -> "models.User":
    teammate = db.query(models.User).filter(models.User.email == TEAMMATE_EMAIL).first()
    if not teammate:
        teammate = models.User(name=TEAMMATE_NAME, email=TEAMMATE_EMAIL, hashed_password=hash_password(TEAMMATE_PASSWORD))
        db.add(teammate)
        db.flush()
    return teammate


def main() -> None:
    models.Base.metadata.create_all(bind=engine)  # makes sure newer tables (focus_sessions) exist
    db = SessionLocal()
    try:
        email = sys.argv[1] if len(sys.argv) > 1 else None
        query = db.query(models.User)
        user = query.filter(models.User.email == email).first() if email else query.order_by(models.User.id).first()
        if not user:
            print("No matching user found. Register in the app first, then run this again.")
            return

        teammate = _get_or_create_teammate(db)
        now = datetime.now()
        all_projects = []

        for name, description, task_defs in PROJECTS:
            if db.query(models.Project).filter(models.Project.owner_id == user.id, models.Project.name == name).first():
                print(f'Skipping "{name}" - already exists for {user.email}.')
                all_projects.append(None)
                continue

            project = models.Project(name=name, description=description, owner_id=user.id)
            db.add(project)
            db.flush()

            created_tasks = []
            for title, desc, status, priority, due_in, age, assign in task_defs:
                task = models.Task(
                    title=title,
                    description=desc,
                    status=models.TaskStatus(status),
                    priority=models.TaskPriority(priority),
                    due_date=datetime.combine(date.today() + timedelta(days=due_in), datetime.min.time()) if due_in is not None else None,
                    project_id=project.id,
                    assignee_id=teammate.id if assign else None,
                    created_at=now - timedelta(days=age),
                )
                db.add(task)
                created_tasks.append(task)
            db.flush()

            db.add(models.Activity(
                action=f"Created project '{name}'", user_id=user.id, project_id=project.id,
                created_at=now - timedelta(days=max(age for *_, age, _ in task_defs) + 1),
            ))
            for task in created_tasks:
                db.add(models.Activity(
                    action=f"Created task '{task.title}' in '{name}'"
                    + (f" and assigned it to {teammate.name}" if task.assignee_id else ""),
                    user_id=user.id, project_id=project.id, created_at=task.created_at,
                ))
                if task.status == models.TaskStatus.done:
                    db.add(models.Activity(
                        action=f"Completed task '{task.title}'", user_id=user.id, project_id=project.id,
                        created_at=task.created_at + timedelta(days=2),
                    ))
                elif task.status == models.TaskStatus.in_progress:
                    db.add(models.Activity(
                        action=f"Updated task '{task.title}'", user_id=user.id, project_id=project.id,
                        created_at=task.created_at + timedelta(days=1),
                    ))

            all_projects.append(created_tasks)

        for proj_idx, task_idx, minutes, days_ago in SESSIONS:
            tasks = all_projects[proj_idx]
            if not tasks:  # that project already existed and was skipped
                continue
            db.add(models.FocusSession(user_id=user.id, task_id=tasks[task_idx].id, minutes=minutes, created_at=now - timedelta(days=days_ago)))

        db.commit()
        total_tasks = sum(len(t) for t in all_projects if t)
        added = sum(1 for t in all_projects if t)
        print(f"Added {added} project(s) with {total_tasks} tasks for {user.email}.")
        if added:
            print(f"A second account, {TEAMMATE_EMAIL} / {TEAMMATE_PASSWORD}, was added/reused as the assignee on some tasks.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
