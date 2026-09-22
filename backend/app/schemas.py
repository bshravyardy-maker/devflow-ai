from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── User ──────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def new_password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


# ── Project ───────────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "active"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: str
    owner_id: int
    created_at: datetime
    task_count: int = 0
    done_count: int = 0
    progress: float = 0.0

    model_config = {"from_attributes": True}


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[datetime] = None
    project_id: int
    assignee_id: Optional[int] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None


class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[datetime]
    project_id: int
    assignee_id: Optional[int]
    created_at: datetime
    assignee: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ── Activity ──────────────────────────────────────────────────────────────────

class ActivityOut(BaseModel):
    id: int
    action: str
    user_id: int
    project_id: Optional[int]
    created_at: datetime
    user: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_projects: int
    active_projects: int
    total_tasks: int
    completed_tasks: int
    completion_percentage: float
    projects: List[ProjectOut]
    recent_tasks: List[TaskOut]
    recent_activities: List[ActivityOut]
    task_status_counts: dict


# ── AI ────────────────────────────────────────────────────────────────────────

class AIGenerateRequest(BaseModel):
    project_id: int
    goal: str


class AIGeneratedTask(BaseModel):
    title: str
    description: str
    priority: str = "medium"
    due_date: Optional[str] = None


class AIGenerateResponse(BaseModel):
    tasks: List[AIGeneratedTask]


class AITasksAdd(BaseModel):
    project_id: int
    tasks: List[AIGeneratedTask]


# ── AI Focus Coach ─────────────────────────────────────────────────────────────

class FocusTaskOut(BaseModel):
    id: int
    title: str
    project_id: int
    project_name: str
    status: str
    priority: str
    due_date: Optional[datetime] = None
    score: int
    urgency: str
    reasons: List[str]


class FocusCoachOut(BaseModel):
    summary: str
    open_count: int
    overdue_count: int
    due_soon_count: int
    in_progress_count: int
    focus_tasks: List[FocusTaskOut]
    coach_message: Optional[str] = None
    ai_used: bool = False


# ── Analytics ──────────────────────────────────────────────────────────────────

class ProjectProgressOut(BaseModel):
    id: int
    name: str
    total: int
    done: int
    progress: float


class DailyCountOut(BaseModel):
    date: str
    count: int


class AnalyticsOut(BaseModel):
    total_tasks: int
    completed_tasks: int
    completion_percentage: float
    overdue_tasks: int
    due_this_week: int
    status_counts: dict
    priority_counts: dict
    project_progress: List[ProjectProgressOut]
    tasks_created_last_14_days: List[DailyCountOut]


# ── Project Health ─────────────────────────────────────────────────────────────

class HealthRisk(BaseModel):
    level: str
    text: str


class ProjectReportOut(BaseModel):
    summary: str
    risks: List[str] = []
    next_steps: List[str] = []


class ProjectHealthOut(BaseModel):
    project_id: int
    project_name: str
    score: Optional[int] = None
    label: str
    metrics: dict
    risks: List[HealthRisk]
    report: Optional[ProjectReportOut] = None
    ai_used: bool = False


# ── Focus Timer ────────────────────────────────────────────────────────────────

class FocusSessionCreate(BaseModel):
    task_id: Optional[int] = None
    minutes: int

    @field_validator("minutes")
    @classmethod
    def minutes_in_range(cls, v: int) -> int:
        if v < 1 or v > 180:
            raise ValueError("Session length must be between 1 and 180 minutes")
        return v


class FocusSessionOut(BaseModel):
    id: int
    task_id: Optional[int] = None
    task_title: Optional[str] = None
    minutes: int
    created_at: datetime


class FocusDailyOut(BaseModel):
    date: str
    minutes: int


class FocusTopTaskOut(BaseModel):
    task_id: int
    title: str
    project_name: str
    minutes: int


class FocusSummaryOut(BaseModel):
    today_minutes: int
    week_minutes: int
    total_minutes: int
    sessions_today: int
    streak_days: int
    daily_minutes: List[FocusDailyOut]
    top_tasks: List[FocusTopTaskOut]
    recent_sessions: List[FocusSessionOut]


# ── AI Weekly Digest ─────────────────────────────────────────────────────────────

class DigestOut(BaseModel):
    period_days: int
    completed_count: int
    created_count: int
    active_projects: int
    highlights: List[str] = []
    summary: Optional[str] = None
    ai_used: bool = False

