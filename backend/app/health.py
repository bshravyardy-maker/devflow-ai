"""Rule-based project health analysis (pure functions, no I/O)."""
from datetime import date
from typing import Dict, List, Optional, Sequence

STALE_DAYS = 14
DUE_SOON_DAYS = 3


def analyze(tasks: Sequence[dict], today: date) -> dict:
    """Score a project 0-100 from its tasks.

    Each task is a dict: {"status": str, "priority": str, "due": date | None, "created": date | None}.
    Returns {"score": int | None, "label": str, "metrics": dict, "risks": [{"level", "text"}]}.
    """
    total = len(tasks)
    done = sum(1 for t in tasks if t["status"] == "done")
    open_tasks = [t for t in tasks if t["status"] != "done"]
    n_open = len(open_tasks)

    overdue = sum(1 for t in open_tasks if t.get("due") and t["due"] < today)
    due_soon = sum(
        1 for t in open_tasks
        if t.get("due") and 0 <= (t["due"] - today).days <= DUE_SOON_DAYS
    )
    stale = sum(
        1 for t in open_tasks
        if t["status"] == "todo" and t.get("created") and (today - t["created"]).days > STALE_DAYS
    )
    high_todo = sum(1 for t in open_tasks if t["priority"] == "high" and t["status"] == "todo")
    undated = sum(1 for t in open_tasks if not t.get("due"))
    in_progress = sum(1 for t in open_tasks if t["status"] == "in_progress")

    metrics: Dict[str, int] = {
        "total": total,
        "done": done,
        "open": n_open,
        "in_progress": in_progress,
        "overdue": overdue,
        "due_soon": due_soon,
        "stale": stale,
        "high_priority_not_started": high_todo,
        "no_due_date": undated,
        "completion_pct": round(done / total * 100) if total else 0,
    }

    if total == 0:
        return {
            "score": None,
            "label": "No tasks",
            "metrics": metrics,
            "risks": [{"level": "low", "text": "No tasks yet - add some manually or use the AI Task Generator."}],
        }
    if n_open == 0:
        return {"score": 100, "label": "Complete", "metrics": metrics, "risks": []}

    score = 100
    score -= min(40, overdue * 10)
    score -= min(20, stale * 4)
    score -= min(15, high_todo * 5)
    many_undated = n_open >= 3 and undated / n_open > 0.5
    if many_undated:
        score -= 10
    score = max(0, min(100, score))

    risks: List[Dict[str, str]] = []
    if overdue:
        risks.append({"level": "high", "text": f"{overdue} overdue task{'s' if overdue != 1 else ''}"})
    if stale:
        risks.append({"level": "medium", "text": f"{stale} task{'s' if stale != 1 else ''} not started after {STALE_DAYS}+ days"})
    if high_todo:
        risks.append({"level": "medium", "text": f"{high_todo} high-priority task{'s' if high_todo != 1 else ''} not started"})
    if due_soon:
        risks.append({"level": "low", "text": f"{due_soon} task{'s' if due_soon != 1 else ''} due within {DUE_SOON_DAYS} days"})
    if many_undated:
        risks.append({"level": "low", "text": "Most open tasks have no due date"})

    label = "Healthy" if score >= 80 else "Needs attention" if score >= 55 else "At risk"
    return {"score": score, "label": label, "metrics": metrics, "risks": risks}
