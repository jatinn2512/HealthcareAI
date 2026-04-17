from fastapi import APIRouter

from app.api.aqi import router as aqi_router
from app.api.auth import router as auth_router
from app.api.doctor import router as doctor_router
from app.api.health import router as health_router
from app.api.nutrition import router as nutrition_router
from app.api.plan import router as plan_router
from app.api.restaurant import router as restaurant_router
from app.api.risk import router as risk_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(plan_router)
api_router.include_router(nutrition_router)
api_router.include_router(aqi_router)
api_router.include_router(health_router)
api_router.include_router(restaurant_router)
api_router.include_router(risk_router)
api_router.include_router(doctor_router)
