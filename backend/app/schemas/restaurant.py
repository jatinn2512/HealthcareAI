from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RestaurantInteractionCreate(BaseModel):
    restaurant_name: str = Field(min_length=2, max_length=150)
    action: str = Field(min_length=2, max_length=50)
    query_text: str | None = Field(default=None, max_length=255)
    dish_name: str | None = Field(default=None, max_length=150)
    impact_label: str | None = Field(default=None, max_length=40)


class RestaurantInteractionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    restaurant_name: str
    action: str
    query_text: str | None
    dish_name: str | None
    impact_label: str | None
    created_at: datetime


AlertLevel = Literal["green", "yellow", "red"]


class DishCatalogOut(BaseModel):
    id: str
    name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    sugar_g: float
    sodium_mg: float
    fiber_g: float
    vitamins: list[str]
    alert: AlertLevel
    alert_message: str
    choose_button_label: str
    choose_feedback: str


class RestaurantCatalogOut(BaseModel):
    id: str
    name: str
    cuisine: str
    dish_count: int
    dishes: list[DishCatalogOut]


class RestaurantCatalogResponse(BaseModel):
    restaurants: list[RestaurantCatalogOut]
    total: int


class DishSuggestionOut(BaseModel):
    restaurant_id: str
    dish_id: str
    dish_name: str
    alert: AlertLevel


class DishChooseRequest(BaseModel):
    restaurant_id: str = Field(min_length=1, max_length=64)
    dish_id: str = Field(min_length=1, max_length=128)


class DishChooseResponse(BaseModel):
    restaurant_id: str
    restaurant_name: str
    dish_id: str
    dish_name: str
    alert: AlertLevel
    message: str
    interaction_id: int
    meal_log_id: int
