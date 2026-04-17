from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_tracking_db
from app.models.user import User
from app.schemas.nutrition import (
    HydrationLogCreate,
    HydrationLogOut,
    MealLogCreate,
    MealLogOut,
    NutritionGoalOut,
    NutritionGoalUpsert,
    NutritionSummaryOut,
)
from app.services import auth_service, nutrition_service

router = APIRouter(prefix="/nutrition", tags=["Nutrition"])


@router.put("/goals", response_model=NutritionGoalOut)
def upsert_nutrition_goal(
    payload: NutritionGoalUpsert,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return nutrition_service.upsert_goal(db, current_user.id, payload)


@router.get("/goals", response_model=NutritionGoalOut | None)
def get_nutrition_goal(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return nutrition_service.get_goal(db, current_user.id)


@router.post("/meals", response_model=MealLogOut, status_code=201)
def create_meal_log(
    payload: MealLogCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return nutrition_service.add_meal(db, current_user.id, payload)


@router.get("/meals", response_model=list[MealLogOut])
def get_meal_logs(
    target_date: date = Query(default_factory=date.today),
    limit: int = Query(default=100, ge=1, le=200),
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return nutrition_service.list_meals(db, current_user.id, target_date, limit)


@router.post("/hydration", response_model=HydrationLogOut, status_code=201)
def create_hydration_log(
    payload: HydrationLogCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return nutrition_service.add_hydration(db, current_user.id, payload)


@router.get("/hydration", response_model=list[HydrationLogOut])
def get_hydration_logs(
    target_date: date = Query(default_factory=date.today),
    limit: int = Query(default=100, ge=1, le=200),
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return nutrition_service.list_hydration(db, current_user.id, target_date, limit)


@router.get("/summary", response_model=NutritionSummaryOut)
def get_nutrition_summary(
    target_date: date = Query(default_factory=date.today),
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return nutrition_service.nutrition_summary(db, current_user.id, target_date)
