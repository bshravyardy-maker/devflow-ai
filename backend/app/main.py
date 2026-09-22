from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.database import engine
from app import models
from app.routers import auth, users, projects, tasks, dashboard, ai, focus_sessions

# Create all tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DevFlow AI API",
    description="Backend API for DevFlow AI – developer project & task management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(ai.router)
app.include_router(focus_sessions.router)


@app.get("/health")
def health():
    return {"status": "ok"}
