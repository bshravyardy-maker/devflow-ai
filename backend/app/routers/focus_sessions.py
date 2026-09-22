from datetime import date, datetime, timedelta
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import focus, models, schemas
from app.auth import get_current_user
from app.database import get_db
from app.routers.tasks import _log_activity

router = APIRouter(prefix="/api/focus", tags=["focus"])


def _session_out(s: models.FocusSession) -> schemas.FocusSessionOut:
    return schemas.FocusSessionOut(
        id=s.id,
        task_id=s.task_id,
        task_title=s.task.title if s.task else None,
        minutes=s.minutes,
        created_at=s.created_at,
    )


@router.post("/sessions", response_model=schemas.FocusSessionOut, status_code=201)
def log_session(
    payload: schemas.FocusSessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    task = None
    if payload.task_id is not None:
        task = (
            db.query(models.Task)
            .join(models.Project, models.Task.project_id == models.Project.id)
            .filter(models.Task.id == payload.task_id, models.Project.owner_id == current_user.id)
            .first()
        )
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

    session = models.FocusSession(
        user_id=current_user.id,
        task_id=task.id if task else None,
        minutes=payload.minutes,
        created_at=datetime.now(),
    )
    db.add(session)
    what = f"on '{task.title}'" if task else "(no task selected)"
    _log_activity(
        db,
        f"Completed a {payload.minutes}-minute focus session {what}",
        current_user.id,
        task.project_id if task else None,
    )
    db.commit()
    db.refresh(session)
    return _session_out(session)


@router.get("/summary", response_model=schemas.FocusSummaryOut)
def focus_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sessions: List[models.FocusSession] = (
        db.query(models.FocusSession)
        .filter(models.FocusSession.user_id == current_user.id)
        .order_by(models.FocusSession.created_at.desc())
        .all()
    )
    today = date.today()

    minutes_by_day: Dict[date, int] = {}
    for s in sessions:
        d = s.created_at.date()
        minutes_by_day[d] = minutes_by_day.get(d, 0) + s.minutes

    daily = [
        schemas.FocusDailyOut(
            date=(today - timedelta(days=i)).isoformat(),
            minutes=minutes_by_day.get(today - timedelta(days=i), 0),
        )
        for i in range(6, -1, -1)
    ]

    per_task: Dict[int, int] = {}
    for s in sessions:
        if s.task_id is not None and s.task is not None:
            per_task[s.task_id] = per_task.get(s.task_id, 0) + s.minutes
    top_tasks = []
    for task_id, minutes in sorted(per_task.items(), key=lambda kv: -kv[1])[:5]:
        task = db.query(models.Task).filter(models.Task.id == task_id).first()
        if task:
            top_tasks.append(schemas.FocusTopTaskOut(
                task_id=task.id,
                title=task.title,
                project_name=task.project.name if task.project else "",
                minutes=minutes,
            ))

    return schemas.FocusSummaryOut(
        today_minutes=minutes_by_day.get(today, 0),
        week_minutes=sum(d.minutes for d in daily),
        total_minutes=sum(s.minutes for s in sessions),
        sessions_today=sum(1 for s in sessions if s.created_at.date() == today),
        streak_days=focus.compute_streak(minutes_by_day.keys(), today),
        daily_minutes=daily,
        top_tasks=top_tasks,
        recent_sessions=[_session_out(s) for s in sessions[:5]],
    )
