from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.routes import api_router
from app.core.config import settings
from app.db.session import init_db
from app.services.plan_service import ensure_default_plans
from app.db.session import CoreSessionLocal
from app.services.health_service import warmup_health_models
from app.services.auth_service import ensure_demo_hospital_account

app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_db()
    warmup_health_models()
    db = CoreSessionLocal()
    try:
        ensure_default_plans(db)
        ensure_demo_hospital_account(db)
    finally:
        db.close()


app.include_router(api_router, prefix="/api")
app.include_router(health_router)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"status": "ok", "message": "CuraSync backend is running"}
