from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _project_out(project: models.Project) -> schemas.ProjectOut:
    tasks = project.tasks
    total = len(tasks)
    done = sum(1 for t in tasks if t.status == models.TaskStatus.done)
    progress = round((done / total) * 100, 1) if total > 0 else 0.0
    return schemas.ProjectOut(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status.value,
        owner_id=project.owner_id,
        created_at=project.created_at,
        task_count=total,
        done_count=done,
        progress=progress,
    )


def _log_activity(db: Session, action: str, user_id: int, project_id: int):
    activity = models.Activity(action=action, user_id=user_id, project_id=project_id)
    db.add(activity)


@router.get("", response_model=List[schemas.ProjectOut])
def list_projects(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    projects = db.query(models.Project).filter(models.Project.owner_id == current_user.id).all()
    return [_project_out(p) for p in projects]


@router.post("", response_model=schemas.ProjectOut, status_code=201)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = models.Project(
        name=payload.name,
        description=payload.description,
        status=payload.status or "active",
        owner_id=current_user.id,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    _log_activity(db, f"Created project '{project.name}'", current_user.id, project.id)
    db.commit()
    return _project_out(project)


@router.get("/{project_id}", response_model=schemas.ProjectOut)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _project_out(project)


@router.put("/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    if payload.status is not None:
        project.status = payload.status

    db.commit()
    db.refresh(project)
    _log_activity(db, f"Updated project '{project.name}'", current_user.id, project.id)
    db.commit()
    return _project_out(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    project = db.query(models.Project).filter(
        models.Project.id == project_id,
        models.Project.owner_id == current_user.id,
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
