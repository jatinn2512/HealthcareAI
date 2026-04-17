from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_tracking_db
from app.models.user import User
from app.schemas.restaurant import (
    DishChooseRequest,
    DishChooseResponse,
    DishSuggestionOut,
    RestaurantCatalogResponse,
    RestaurantInteractionCreate,
    RestaurantInteractionOut,
)
from app.services import auth_service, restaurant_service

router = APIRouter(prefix="/restaurant", tags=["Restaurant"])


@router.get("/catalog", response_model=RestaurantCatalogResponse)
def get_catalog(
    q: str | None = Query(default=None, min_length=1, max_length=120),
    current_user: User = Depends(auth_service.get_current_user),
):
    restaurants = restaurant_service.list_catalog(q)
    return {"restaurants": restaurants, "total": len(restaurants)}


@router.get("/suggestions", response_model=list[DishSuggestionOut])
def get_dish_suggestions(
    restaurant_id: str = Query(min_length=1, max_length=64),
    q: str = Query(min_length=1, max_length=120),
    limit: int = Query(default=8, ge=1, le=20),
    current_user: User = Depends(auth_service.get_current_user),
):
    return restaurant_service.list_dish_suggestions(restaurant_id=restaurant_id, query=q, limit=limit)


@router.post("/choose", response_model=DishChooseResponse, status_code=201)
def choose_dish(
    payload: DishChooseRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return restaurant_service.choose_dish(db=db, user_id=current_user.id, payload=payload)


@router.post("/interactions", response_model=RestaurantInteractionOut, status_code=201)
def create_interaction(
    payload: RestaurantInteractionCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return restaurant_service.log_interaction(db, current_user.id, payload)


@router.get("/interactions", response_model=list[RestaurantInteractionOut])
def get_interactions(
    limit: int = Query(default=50, ge=1, le=200),
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return restaurant_service.list_interactions(db, current_user.id, limit)
