import json
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dish_nutrition import MealLog, RestaurantInteraction
from app.schemas.restaurant import DishChooseRequest, RestaurantInteractionCreate

MOCK_DATA_PATH = Path(__file__).resolve().parents[2] / "mock_data" / "restraunt.json"


def _load_catalog_data() -> dict:
    if not MOCK_DATA_PATH.exists():
        raise HTTPException(status_code=500, detail="Restaurant mock data file is missing.")

    try:
        data = json.loads(MOCK_DATA_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="Restaurant mock data is invalid JSON.") from exc

    restaurants = data.get("restaurants")
    if not isinstance(restaurants, list):
        raise HTTPException(status_code=500, detail="Restaurant mock data format is invalid.")

    return data


def _normalized(value: str) -> str:
    return value.strip().lower()


def list_catalog(query: str | None = None) -> list[dict]:
    data = _load_catalog_data()
    restaurants: list[dict] = data["restaurants"]

    if not query or not query.strip():
        return restaurants

    q = _normalized(query)
    filtered: list[dict] = []
    for restaurant in restaurants:
        restaurant_text = " ".join(
            [
                str(restaurant.get("name", "")),
                str(restaurant.get("cuisine", "")),
            ]
        ).lower()
        dishes = restaurant.get("dishes", [])
        dish_match = any(q in str(dish.get("name", "")).lower() for dish in dishes)
        if q in restaurant_text or dish_match:
            filtered.append(restaurant)

    return filtered


def list_dish_suggestions(restaurant_id: str, query: str, limit: int = 8) -> list[dict]:
    q = _normalized(query)
    if not q:
        return []

    restaurants = _load_catalog_data()["restaurants"]
    restaurant = next((r for r in restaurants if str(r.get("id")) == str(restaurant_id)), None)
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    ranked: list[dict] = []
    for dish in restaurant.get("dishes", []):
        dish_name = str(dish.get("name", ""))
        name_lc = dish_name.lower()
        if q not in name_lc:
            continue
        starts_with = name_lc.startswith(q)
        ranked.append(
            {
                "restaurant_id": str(restaurant.get("id")),
                "dish_id": str(dish.get("id")),
                "dish_name": dish_name,
                "alert": str(dish.get("alert", "yellow")),
                "_starts_with": starts_with,
            }
        )

    ranked.sort(key=lambda item: (not item["_starts_with"], len(item["dish_name"]), item["dish_name"].lower()))
    trimmed = ranked[:limit]
    for item in trimmed:
        item.pop("_starts_with", None)
    return trimmed


def choose_dish(db: Session, user_id: int, payload: DishChooseRequest) -> dict:
    restaurants = _load_catalog_data()["restaurants"]
    restaurant = next((r for r in restaurants if str(r.get("id")) == str(payload.restaurant_id)), None)
    if restaurant is None:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    dish = next((d for d in restaurant.get("dishes", []) if str(d.get("id")) == str(payload.dish_id)), None)
    if dish is None:
        raise HTTPException(status_code=404, detail="Dish not found.")

    alert = str(dish.get("alert", "yellow"))
    choose_message = str(dish.get("choose_feedback") or dish.get("alert_message") or "")

    interaction = RestaurantInteraction(
        user_id=user_id,
        restaurant_name=str(restaurant.get("name", "")),
        action="choose_dish",
        query_text=None,
        dish_name=str(dish.get("name", "")),
        impact_label=alert,
    )

    meal_log = MealLog(
        user_id=user_id,
        meal_type="Restaurant",
        food_name=f"{dish.get('name', '')} ({restaurant.get('name', '')})",
        calories=int(float(dish.get("calories", 0) or 0)),
        protein_g=float(dish.get("protein_g", 0) or 0),
        carbs_g=float(dish.get("carbs_g", 0) or 0),
        fat_g=float(dish.get("fat_g", 0) or 0),
        sodium_mg=float(dish.get("sodium_mg", 0) or 0),
        notes=choose_message,
    )

    db.add(interaction)
    db.add(meal_log)
    db.commit()
    db.refresh(interaction)
    db.refresh(meal_log)

    return {
        "restaurant_id": str(restaurant.get("id")),
        "restaurant_name": str(restaurant.get("name", "")),
        "dish_id": str(dish.get("id")),
        "dish_name": str(dish.get("name", "")),
        "alert": alert,
        "message": choose_message,
        "interaction_id": interaction.id,
        "meal_log_id": meal_log.id,
    }


def log_interaction(db: Session, user_id: int, payload: RestaurantInteractionCreate) -> RestaurantInteraction:
    interaction = RestaurantInteraction(user_id=user_id, **payload.model_dump())
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction


def list_interactions(db: Session, user_id: int, limit: int = 50) -> list[RestaurantInteraction]:
    return list(
        db.scalars(
            select(RestaurantInteraction)
            .where(RestaurantInteraction.user_id == user_id)
            .order_by(RestaurantInteraction.created_at.desc())
            .limit(limit)
        )
    )
