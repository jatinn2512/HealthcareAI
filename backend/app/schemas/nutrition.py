from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class NutritionGoalUpsert(BaseModel):
    calorie_target: int = Field(ge=500, le=10000)
    protein_target_g: float = Field(ge=0, le=1000)
    carbs_target_g: float = Field(ge=0, le=2000)
    fat_target_g: float = Field(ge=0, le=1000)
    water_target_ml: int = Field(ge=200, le=10000)


class NutritionGoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    calorie_target: int
    protein_target_g: float
    carbs_target_g: float
    fat_target_g: float
    water_target_ml: int
    updated_at: datetime


class MealLogCreate(BaseModel):
    meal_type: str = Field(min_length=2, max_length=30)
    food_name: str = Field(min_length=2, max_length=255)
    calories: int = Field(ge=0, le=10000)
    protein_g: float = Field(default=0, ge=0)
    carbs_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)
    sodium_mg: float = Field(default=0, ge=0)
    notes: str | None = None


class MealLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meal_type: str
    food_name: str
    calories: int
    protein_g: float
    carbs_g: float
    fat_g: float
    sodium_mg: float
    notes: str | None
    logged_at: datetime


class HydrationLogCreate(BaseModel):
    amount_ml: int = Field(ge=1, le=5000)


class HydrationLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    amount_ml: int
    logged_at: datetime


class NutritionSummaryOut(BaseModel):
    date: date
    totals: dict[str, float]
    targets: dict[str, float]
    remaining: dict[str, float]
    progress_pct: dict[str, float]
