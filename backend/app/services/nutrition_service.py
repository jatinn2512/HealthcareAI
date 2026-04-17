from datetime import UTC, date, datetime

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.models.dish_nutrition import HydrationLog, MealLog, NutritionGoal
from app.schemas.nutrition import HydrationLogCreate, MealLogCreate, NutritionGoalUpsert


def upsert_goal(db: Session, user_id: int, payload: NutritionGoalUpsert) -> NutritionGoal:
    goal = db.scalar(select(NutritionGoal).where(NutritionGoal.user_id == user_id))
    if not goal:
        goal = NutritionGoal(user_id=user_id, **payload.model_dump())
    else:
        for key, value in payload.model_dump().items():
            setattr(goal, key, value)
        goal.updated_at = datetime.now(UTC)

    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def get_goal(db: Session, user_id: int) -> NutritionGoal | None:
    return db.scalar(select(NutritionGoal).where(NutritionGoal.user_id == user_id))


def add_meal(db: Session, user_id: int, payload: MealLogCreate) -> MealLog:
    meal = MealLog(user_id=user_id, **payload.model_dump())
    db.add(meal)
    db.commit()
    db.refresh(meal)
    return meal


def add_hydration(db: Session, user_id: int, payload: HydrationLogCreate) -> HydrationLog:
    hydration = HydrationLog(user_id=user_id, **payload.model_dump())
    db.add(hydration)
    db.commit()
    db.refresh(hydration)
    return hydration


def list_meals(db: Session, user_id: int, target_date: date, limit: int = 100) -> list[MealLog]:
    start_dt = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=UTC)
    end_dt = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=UTC)
    return list(
        db.scalars(
            select(MealLog)
            .where(and_(MealLog.user_id == user_id, MealLog.logged_at >= start_dt, MealLog.logged_at <= end_dt))
            .order_by(MealLog.logged_at.desc())
            .limit(limit)
        )
    )


def list_hydration(db: Session, user_id: int, target_date: date, limit: int = 100) -> list[HydrationLog]:
    start_dt = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=UTC)
    end_dt = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=UTC)
    return list(
        db.scalars(
            select(HydrationLog)
            .where(and_(HydrationLog.user_id == user_id, HydrationLog.logged_at >= start_dt, HydrationLog.logged_at <= end_dt))
            .order_by(HydrationLog.logged_at.desc())
            .limit(limit)
        )
    )


def nutrition_summary(db: Session, user_id: int, target_date: date) -> dict:
    start_dt = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=UTC)
    end_dt = datetime.combine(target_date, datetime.max.time()).replace(tzinfo=UTC)

    meal_totals = db.execute(
        select(
            func.coalesce(func.sum(MealLog.calories), 0),
            func.coalesce(func.sum(MealLog.protein_g), 0),
            func.coalesce(func.sum(MealLog.carbs_g), 0),
            func.coalesce(func.sum(MealLog.fat_g), 0),
        ).where(and_(MealLog.user_id == user_id, MealLog.logged_at >= start_dt, MealLog.logged_at <= end_dt))
    ).one()

    water_total = db.execute(
        select(func.coalesce(func.sum(HydrationLog.amount_ml), 0)).where(
            and_(HydrationLog.user_id == user_id, HydrationLog.logged_at >= start_dt, HydrationLog.logged_at <= end_dt)
        )
    ).scalar_one()

    goal = get_goal(db, user_id) or NutritionGoal(
        user_id=user_id,
        calorie_target=2200,
        protein_target_g=120,
        carbs_target_g=280,
        fat_target_g=70,
        water_target_ml=2500,
    )

    totals = {
        "calories": float(meal_totals[0]),
        "protein_g": float(meal_totals[1]),
        "carbs_g": float(meal_totals[2]),
        "fat_g": float(meal_totals[3]),
        "water_ml": float(water_total),
    }
    targets = {
        "calories": float(goal.calorie_target),
        "protein_g": float(goal.protein_target_g),
        "carbs_g": float(goal.carbs_target_g),
        "fat_g": float(goal.fat_target_g),
        "water_ml": float(goal.water_target_ml),
    }

    remaining = {key: round(max(targets[key] - totals[key], 0), 2) for key in totals.keys()}
    progress_pct = {
        key: round(min((totals[key] / targets[key]) * 100 if targets[key] else 0, 100), 2) for key in totals.keys()
    }

    return {
        "date": target_date,
        "totals": totals,
        "targets": targets,
        "remaining": remaining,
        "progress_pct": progress_pct,
    }
