"""Smoke test for the Gemini task generator against a RUNNING backend (real Gemini call).

Usage:  uvicorn app.main:app --port 8000   (in another terminal, with GEMINI_API_KEY set in backend/.env)
        python test_ai.py
"""
import sys

import requests

ROOT = "http://127.0.0.1:8000"
BASE_URL = f"{ROOT}/api"


def fail(msg, res=None):
    print("FAIL:", msg)
    if res is not None:
        print("  status:", res.status_code, "| body:", res.text[:300])
    sys.exit(1)


# 0. Health check
res = requests.get(f"{ROOT}/health", timeout=10)
if res.status_code != 200:
    fail("health check", res)
print("OK   health:", res.json())

# 1. Register (ignored if the user already exists) and log in
requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Test User", "email": "testai@example.com", "password": "password123",
}, timeout=10)
res = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "testai@example.com", "password": "password123",
}, timeout=10)
if res.status_code != 200:
    fail("login", res)
headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

# 2. Create a project
res = requests.post(f"{BASE_URL}/projects", json={
    "name": "AI Test Project", "description": "Testing AI generation",
}, headers=headers, timeout=10)
if res.status_code != 201:
    fail("project creation", res)
project_id = res.json()["id"]

# 3. Generate tasks with real Gemini (can take a while)
res = requests.post(f"{BASE_URL}/ai/generate-tasks", json={
    "project_id": project_id,
    "goal": "Build a secure user authentication system with email verification and password reset",
}, headers=headers, timeout=150)
if res.status_code != 200:
    fail("generate-tasks", res)
tasks = res.json()["tasks"]
print(f"OK   generated {len(tasks)} tasks")
for i, t in enumerate(tasks, 1):
    print(f"  {i:>2}. [{t['priority']:<6}] {t['title']}")
if not 10 <= len(tasks) <= 15:
    fail(f"expected 10-15 tasks, got {len(tasks)}")
if len({t["title"].lower() for t in tasks}) != len(tasks):
    fail("duplicate titles returned")

# 4. Save them and confirm they are stored
res = requests.post(f"{BASE_URL}/ai/add-tasks", json={
    "project_id": project_id, "tasks": tasks,
}, headers=headers, timeout=30)
if res.status_code != 201 or len(res.json()) != len(tasks):
    fail("add-tasks", res)
first_task_id = res.json()[0]["id"]
res = requests.get(f"{BASE_URL}/tasks", params={"project_id": project_id}, headers=headers, timeout=10)
if res.status_code != 200 or len(res.json()) < len(tasks):
    fail("saved tasks not found in database", res)
print(f"OK   saved and re-read {len(tasks)} tasks from the database")

# 5. AI Focus Coach (rule-based ranking) and Analytics
res = requests.get(f"{BASE_URL}/ai/focus-coach", headers=headers, timeout=15)
if res.status_code != 200 or not res.json()["focus_tasks"]:
    fail("focus-coach", res)
print(f"OK   focus coach ranked {len(res.json()['focus_tasks'])} tasks: {res.json()['summary']}")
res = requests.get(f"{BASE_URL}/dashboard/analytics", headers=headers, timeout=15)
if res.status_code != 200 or res.json()["total_tasks"] < len(tasks):
    fail("analytics", res)
print(f"OK   analytics: {res.json()['total_tasks']} tasks, {res.json()['completion_percentage']}% complete")

# 6. AI Project Health (rule-based part) and Focus Timer
res = requests.get(f"{BASE_URL}/ai/project-health/{project_id}", headers=headers, timeout=15)
if res.status_code != 200 or res.json()["score"] is None:
    fail("project-health", res)
print(f"OK   project health: {res.json()['score']}/100 ({res.json()['label']})")
res = requests.post(f"{BASE_URL}/focus/sessions", json={"task_id": first_task_id, "minutes": 25}, headers=headers, timeout=15)
if res.status_code != 201:
    fail("log focus session", res)
res = requests.get(f"{BASE_URL}/focus/summary", headers=headers, timeout=15)
if res.status_code != 200 or res.json()["today_minutes"] < 25:
    fail("focus summary", res)
print(f"OK   focus timer: {res.json()['today_minutes']} min today, streak {res.json()['streak_days']}")

# 7. Task assignment: create a second user and assign a task to them
requests.post(f"{BASE_URL}/auth/register", json={
    "name": "Teammate", "email": "testai.teammate@example.com", "password": "password123",
}, timeout=10)
res = requests.get(f"{BASE_URL}/users", headers=headers, timeout=10)
if res.status_code != 200:
    fail("list users", res)
teammate = next((u for u in res.json() if u["email"] == "testai.teammate@example.com"), None)
if not teammate:
    fail("teammate not found in user list")
res = requests.put(f"{BASE_URL}/tasks/{first_task_id}", json={"assignee_id": teammate["id"]}, headers=headers, timeout=10)
if res.status_code != 200 or not res.json().get("assignee") or res.json()["assignee"]["id"] != teammate["id"]:
    fail("assign task", res)
res = requests.get(f"{BASE_URL}/tasks", params={"assignee_id": teammate["id"]}, headers=headers, timeout=10)
if res.status_code != 200 or len(res.json()) < 1:
    fail("filter tasks by assignee", res)
print(f"OK   assigned a task to {teammate['name']} and filtered by assignee")

# 8. AI Weekly Digest (rule-based part)
res = requests.get(f"{BASE_URL}/ai/digest", params={"days": 7}, headers=headers, timeout=15)
if res.status_code != 200:
    fail("digest", res)
print(f"OK   digest: {res.json()['completed_count']} completed, {res.json()['created_count']} created in the last 7 days")
print("ALL CHECKS PASSED")
