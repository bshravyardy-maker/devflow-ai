from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _task_out(task: models.Task) -> schemas.TaskOut:
    assignee = None
    if task.assignee:
        assignee = schemas.UserOut(
            id=task.assignee.id,
            name=task.assignee.name,
            email=task.assignee.email,
            created_at=task.assignee.created_at,
        )
    return schemas.TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status.value,
        priority=task.priority.value,
        due_date=task.due_date,
        project_id=task.project_id,
        assignee_id=task.assignee_id,
        created_at=task.created_at,
        assignee=assignee,
    )


def _log_activity(db: Session, action: str, user_id: int, project_id: int):
    activity = models.Activity(action=action, user_id=user_id, project_id=project_id)
    db.add(activity)


def _owned_project(project_id: int, user_id: int, db: Session) -> models.Project:
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == user_id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("", response_model=List[schemas.TaskOut])
def list_tasks(
    project_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("created_at"),
    sort_order: Optional[str] = Query("desc"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Get all projects owned by current user
    owned_ids = [p.id for p in db.query(models.Project).filter(
        models.Project.owner_id == current_user.id
    ).all()]

    query = db.query(models.Task).filter(models.Task.project_id.in_(owned_ids))

    if project_id:
        query = query.filter(models.Task.project_id == project_id)
    if status:
        query = query.filter(models.Task.status == status)
    if priority:
        query = query.filter(models.Task.priority == priority)
    if assignee_id:
        query = query.filter(models.Task.assignee_id == assignee_id)
    if search:
        query = query.filter(models.Task.title.ilike(f"%{search}%"))

    col = getattr(models.Task, sort_by, models.Task.created_at)
    if sort_order == "asc":
        query = query.order_by(col.asc())
    else:
        query = query.order_by(col.desc())

    tasks = query.all()
    return [_task_out(t) for t in tasks]


@router.post("", response_model=schemas.TaskOut, status_code=201)
def create_task(
    payload: schemas.TaskCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = _owned_project(payload.project_id, current_user.id, db)
    assignee = None
    if payload.assignee_id is not None:
        assignee = db.query(models.User).filter(models.User.id == payload.assignee_id).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Assignee not found")
    task = models.Task(
        title=payload.title,
        description=payload.description,
        status=payload.status or "todo",
        priority=payload.priority or "medium",
        due_date=payload.due_date,
        project_id=payload.project_id,
        assignee_id=payload.assignee_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    action = f"Created task '{task.title}' in '{project.name}'"
    if assignee:
        action += f" and assigned it to {assignee.name}"
    _log_activity(db, action, current_user.id, project.id)
    db.commit()
    return _task_out(task)


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    owned_ids = [p.id for p in db.query(models.Project).filter(
        models.Project.owner_id == current_user.id
    ).all()]
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id.in_(owned_ids),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_out(task)


@router.put("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    payload: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    owned_ids = [p.id for p in db.query(models.Project).filter(
        models.Project.owner_id == current_user.id
    ).all()]
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id.in_(owned_ids),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    fields = payload.model_dump(exclude_unset=True)
    was_done = task.status == models.TaskStatus.done
    old_assignee_id = task.assignee_id

    if "title" in fields:
        task.title = payload.title
    if "description" in fields:
        task.description = payload.description
    if "status" in fields:
        task.status = payload.status
    if "priority" in fields:
        task.priority = payload.priority
    if "due_date" in fields:
        task.due_date = payload.due_date
    if "assignee_id" in fields:
        if payload.assignee_id is not None:
            new_assignee = db.query(models.User).filter(models.User.id == payload.assignee_id).first()
            if not new_assignee:
                raise HTTPException(status_code=400, detail="Assignee not found")
        task.assignee_id = payload.assignee_id

    db.commit()
    db.refresh(task)

    now_done = task.status == models.TaskStatus.done
    if "status" in fields and now_done and not was_done:
        message = f"Completed task '{task.title}'"
    elif "status" in fields and was_done and not now_done:
        message = f"Reopened task '{task.title}'"
    elif "assignee_id" in fields and task.assignee_id != old_assignee_id:
        message = (
            f"Assigned task '{task.title}' to {task.assignee.name}" if task.assignee
            else f"Unassigned task '{task.title}'"
        )
    else:
        message = f"Updated task '{task.title}'"
    _log_activity(db, message, current_user.id, task.project_id)
    db.commit()
    return _task_out(task)


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    owned_ids = [p.id for p in db.query(models.Project).filter(
        models.Project.owner_id == current_user.id
    ).all()]
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.project_id.in_(owned_ids),
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    project_id = task.project_id
    title = task.title
    db.delete(task)
    _log_activity(db, f"Deleted task '{title}'", current_user.id, project_id)
    db.commit()
