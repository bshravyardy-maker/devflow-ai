from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.routers.projects import _project_out
from app.routers.tasks import _task_out

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=schemas.DashboardStats)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    projects = db.query(models.Project).filter(
        models.Project.owner_id == current_user.id
    ).all()
    project_ids = [p.id for p in projects]

    tasks = db.query(models.Task).filter(
        models.Task.project_id.in_(project_ids)
    ).all() if project_ids else []

    total_projects = len(projects)
    active_projects = sum(1 for p in projects if p.status == models.ProjectStatus.active)
    total_tasks = len(tasks)
    completed_tasks = sum(1 for t in tasks if t.status == models.TaskStatus.done)
    completion_pct = round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0.0

    recent_tasks = (
        db.query(models.Task)
        .filter(models.Task.project_id.in_(project_ids))
        .order_by(models.Task.created_at.desc())
        .limit(5)
        .all()
    ) if project_ids else []

    recent_activities = (
        db.query(models.Activity)
        .filter(models.Activity.user_id == current_user.id)
        .order_by(models.Activity.created_at.desc())
        .limit(10)
        .all()
    )

    status_counts = {
        "todo": sum(1 for t in tasks if t.status == models.TaskStatus.todo),
        "in_progress": sum(1 for t in tasks if t.status == models.TaskStatus.in_progress),
        "done": completed_tasks,
    }

    # Build activity out list with user embedded
    activity_outs = []
    for act in recent_activities:
        user_out = schemas.UserOut(
            id=act.user.id,
            name=act.user.name,
            email=act.user.email,
            created_at=act.user.created_at,
        )
        activity_outs.append(schemas.ActivityOut(
            id=act.id,
            action=act.action,
            user_id=act.user_id,
            project_id=act.project_id,
            created_at=act.created_at,
            user=user_out,
        ))

    return schemas.DashboardStats(
        total_projects=total_projects,
        active_projects=active_projects,
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_percentage=completion_pct,
        projects=[_project_out(p) for p in projects[:6]],
        recent_tasks=[_task_out(t) for t in recent_tasks],
        recent_activities=activity_outs,
        task_status_counts=status_counts,
    )


@router.get("/analytics", response_model=schemas.AnalyticsOut)
def get_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    projects = db.query(models.Project).filter(
        models.Project.owner_id == current_user.id
    ).all()
    project_ids = [p.id for p in projects]
    tasks = db.query(models.Task).filter(
        models.Task.project_id.in_(project_ids)
    ).all() if project_ids else []

    today = date.today()
    total = len(tasks)
    done = [t for t in tasks if t.status == models.TaskStatus.done]
    open_tasks = [t for t in tasks if t.status != models.TaskStatus.done]

    overdue = sum(1 for t in open_tasks if t.due_date and t.due_date.date() < today)
    due_this_week = sum(
        1 for t in open_tasks
        if t.due_date and today <= t.due_date.date() <= today + timedelta(days=7)
    )

    status_counts = {s.value: sum(1 for t in tasks if t.status == s) for s in models.TaskStatus}
    priority_counts = {p.value: sum(1 for t in tasks if t.priority == p) for p in models.TaskPriority}

    project_progress = []
    for p in projects:
        p_total = sum(1 for t in tasks if t.project_id == p.id)
        p_done = sum(1 for t in done if t.project_id == p.id)
        project_progress.append(schemas.ProjectProgressOut(
            id=p.id,
            name=p.name,
            total=p_total,
            done=p_done,
            progress=round((p_done / p_total) * 100, 1) if p_total else 0.0,
        ))

    created_by_day = {}
    for t in tasks:
        if t.created_at:
            d = t.created_at.date()
            created_by_day[d] = created_by_day.get(d, 0) + 1
    last_14 = [
        schemas.DailyCountOut(
            date=(today - timedelta(days=i)).isoformat(),
            count=created_by_day.get(today - timedelta(days=i), 0),
        )
        for i in range(13, -1, -1)
    ]

    return schemas.AnalyticsOut(
        total_tasks=total,
        completed_tasks=len(done),
        completion_percentage=round((len(done) / total) * 100, 1) if total else 0.0,
        overdue_tasks=overdue,
        due_this_week=due_this_week,
        status_counts=status_counts,
        priority_counts=priority_counts,
        project_progress=project_progress,
        tasks_created_last_14_days=last_14,
    )
