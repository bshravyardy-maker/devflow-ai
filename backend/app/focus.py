"""Rule-based task prioritisation used by the AI Focus Coach (pure functions, no I/O)."""
from datetime import date, timedelta
from typing import Iterable, List, Optional, Tuple

PRIORITY_POINTS = {"high": 30, "medium": 15, "low": 5}
DUE_SOON_DAYS = 3


def score_task(
    status: str, priority: str, due: Optional[date], today: date
) -> Tuple[int, str, List[str]]:
    """Return (score, urgency, reasons) for one open task. Higher score = do it sooner.

    urgency is one of: "overdue", "due_soon", "normal".
    """
    score = PRIORITY_POINTS.get(priority, 15)
    reasons: List[str] = [f"{priority.capitalize()} priority"]
    urgency = "normal"

    if due is not None:
        days = (due - today).days
        if days < 0:
            late = -days
            score += 40 + min(late, 10) * 2
            urgency = "overdue"
            reasons.append(f"Overdue by {late} day{'s' if late != 1 else ''}")
        elif days == 0:
            score += 35
            urgency = "due_soon"
            reasons.append("Due today")
        elif days <= DUE_SOON_DAYS:
            score += 25
            urgency = "due_soon"
            reasons.append(f"Due in {days} day{'s' if days != 1 else ''}")
        elif days <= 7:
            score += 12
            reasons.append(f"Due in {days} days")

    if status == "in_progress":
        score += 10
        reasons.append("Already in progress - finish what you started")

    return score, urgency, reasons


def build_summary(overdue: int, due_soon: int, in_progress: int, open_count: int) -> str:
    """One-sentence, rule-based overview shown even when Gemini is not used."""
    if open_count == 0:
        return "You have no open tasks. Nice work - add new tasks to keep the momentum going."
    parts = []
    if overdue:
        parts.append(f"{overdue} overdue task{'s' if overdue != 1 else ''}")
    if due_soon:
        parts.append(f"{due_soon} due within {DUE_SOON_DAYS} days")
    if in_progress:
        parts.append(f"{in_progress} in progress")
    if not parts:
        return f"You have {open_count} open task{'s' if open_count != 1 else ''} and nothing urgent. A good time to tackle your highest-priority work."
    return f"You have {open_count} open task{'s' if open_count != 1 else ''}: " + ", ".join(parts) + "."


def compute_streak(days: Iterable[date], today: date) -> int:
    """Consecutive days (ending today, or yesterday if nothing logged yet today) with a focus session."""
    active = set(days)
    cursor = today if today in active else today - timedelta(days=1)
    streak = 0
    while cursor in active:
        streak += 1
        cursor -= timedelta(days=1)
    return streak

