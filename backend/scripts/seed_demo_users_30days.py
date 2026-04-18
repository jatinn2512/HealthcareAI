from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from datetime import UTC, date, datetime, time
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.db.session import CoreSessionLocal, TrackingSessionLocal  # noqa: E402
from app.models.aqi_snapshot import AqiSnapshot  # noqa: E402
from app.models.dish_nutrition import HydrationLog, MealLog, NutritionGoal, RestaurantInteraction  # noqa: E402
from app.models.risk_assessment import ActivityLog, RiskAssessment, SleepLog, VitalsLog  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.user_profile import UserProfile  # noqa: E402

DEFAULT_DATASET = REPO_ROOT / "ai_ml" / "datasets" / "seed" / "demo_users_profiles_30days.json"


@dataclass
class ImportStats:
    users_processed: int = 0
    users_missing: int = 0
    sleep_logs: int = 0
    activity_logs: int = 0
    vitals_logs: int = 0
    hydration_logs: int = 0
    meal_logs: int = 0
    restaurant_logs: int = 0
    risk_assessments: int = 0
    aqi_snapshots: int = 0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed 30-day demo user data into CuraSync databases.")
    parser.add_argument(
        "--dataset",
        default=str(DEFAULT_DATASET),
        help="Path to JSON dataset file.",
    )
    parser.add_argument(
        "--replace-existing",
        action="store_true",
        help="Delete existing tracking logs for target users before inserting new demo data.",
    )
    return parser.parse_args()


def _load_dataset(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _clamp(value: int, min_value: int, max_value: int) -> int:
    return max(min_value, min(max_value, value))


def _to_datetime(day: date, hour: int, minute: int = 0) -> datetime:
    return datetime.combine(day, time(hour=hour, minute=minute, tzinfo=UTC))


def _quality_from_sleep_hours(hours: float) -> int:
    if hours >= 8:
        return 90
    if hours >= 7:
        return 82
    if hours >= 6:
        return 72
    if hours >= 5:
        return 60
    return 45


def _stress_to_heart_rate(stress: str, steps: int) -> int:
    base = {"low": 72, "medium": 80, "high": 90}.get(stress.lower(), 80)
    if steps < 2500:
        base += 5
    elif steps > 9500:
        base -= 4
    return _clamp(base, 55, 120)


def _systolic_to_diastolic(systolic: int) -> int:
    return _clamp(systolic - 45, 60, 105)


def _aqi_category(aqi: int) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


def _meal_macros_by_status(status: str) -> tuple[int, float, float, float, float]:
    normalized = status.strip().lower()
    if normalized == "good":
        return (430, 28.0, 44.0, 14.0, 420.0)
    if normalized == "moderate":
        return (560, 22.0, 56.0, 21.0, 760.0)
    return (760, 18.0, 70.0, 35.0, 1280.0)


def _resolve_activity_level(avg_steps: float) -> str:
    if avg_steps < 4000:
        return "low"
    if avg_steps < 8000:
        return "moderate"
    return "high"


def _build_risk_summary(risk_type: str, payload: dict[str, Any]) -> tuple[str, str]:
    level = str(payload.get("level", "Medium")).title()
    reasons = payload.get("reasons") or []
    if isinstance(reasons, list) and reasons:
        summary = ", ".join(str(reason) for reason in reasons[:3])
    elif "probability" in payload:
        summary = f"Estimated probability: {float(payload['probability']) * 100:.0f}%"
    elif "score" in payload:
        summary = f"Rule-based score: {payload['score']}"
    elif risk_type == "obesity":
        summary = f"BMI based risk: {payload.get('bmi', 'N/A')}"
    else:
        summary = "Risk signal generated from available demo data."
    return level, summary


def _replace_existing_tracking(tracking_db, user_ids: list[int]) -> None:
    if not user_ids:
        return

    for model in [
        MealLog,
        HydrationLog,
        RestaurantInteraction,
        SleepLog,
        ActivityLog,
        VitalsLog,
        RiskAssessment,
        AqiSnapshot,
    ]:
        tracking_db.execute(delete(model).where(model.user_id.in_(user_ids)))

    tracking_db.commit()


def main() -> None:
    args = _parse_args()
    dataset_path = Path(args.dataset).resolve()
    payload = _load_dataset(dataset_path)
    users_payload = payload.get("users", [])
    if not isinstance(users_payload, list):
        raise ValueError("Invalid dataset format: expected top-level 'users' list.")

    stats = ImportStats()
    core_db = CoreSessionLocal()
    tracking_db = TrackingSessionLocal()

    try:
        emails = [str(item.get("email", "")).lower().strip() for item in users_payload]
        db_users = list(core_db.scalars(select(User).where(User.email.in_(emails))).all())
        user_by_email = {user.email.lower().strip(): user for user in db_users}

        if args.replace_existing:
            _replace_existing_tracking(tracking_db, [user.id for user in db_users])

        missing_emails: list[str] = []
        for item in users_payload:
            email = str(item.get("email", "")).lower().strip()
            user = user_by_email.get(email)
            if not user:
                stats.users_missing += 1
                missing_emails.append(email)
                continue

            stats.users_processed += 1
            daily_checkins = item.get("daily_checkins") or []
            food_log = item.get("food_log") or []
            risk_map = item.get("risk") or {}
            overall_risk = str(item.get("overall_risk", "Medium"))

            profile = user.profile
            if profile is None:
                profile = core_db.scalar(select(UserProfile).where(UserProfile.user_id == user.id))
            if profile is None:
                profile = UserProfile(user_id=user.id)
                core_db.add(profile)
                core_db.flush()

            if daily_checkins:
                avg_steps = sum(int(day.get("steps", 0)) for day in daily_checkins) / len(daily_checkins)
                profile.activity_level = _resolve_activity_level(avg_steps)
                profile.medical_notes = f"Demo profile seed. Overall risk: {overall_risk}"
                core_db.add(profile)
                core_db.commit()

            for index, day in enumerate(daily_checkins):
                day_date = date.fromisoformat(str(day["date"]))
                sleep_hours = float(day.get("sleep_hours", 7.0))
                steps = int(day.get("steps", 6000))
                fasting_sugar = int(day.get("fasting_sugar", 95))
                systolic_bp = int(day.get("systolic_bp", 120))
                stress = str(day.get("stress", "medium")).lower()

                sleep_ts = _to_datetime(day_date, 8, 30)
                sleep_log = SleepLog(
                    user_id=user.id,
                    sleep_date=day_date,
                    duration_minutes=int(round(sleep_hours * 60)),
                    sleep_start=_to_datetime(day_date, 23, 0),
                    sleep_end=_to_datetime(day_date, 6, 30),
                    quality_score=_quality_from_sleep_hours(sleep_hours),
                    created_at=sleep_ts,
                    source_type="wearable",
                    recorded_at=sleep_ts,
                    source_device="demo_seed",
                )
                tracking_db.add(sleep_log)
                stats.sleep_logs += 1

                workout_minutes = max(8, min(90, int(steps / 220)))
                activity_ts = _to_datetime(day_date, 19, 0)
                activity_log = ActivityLog(
                    user_id=user.id,
                    steps=steps,
                    workout_minutes=workout_minutes,
                    calories_burned=int((steps * 0.04) + (workout_minutes * 4.8)),
                    distance_km=round(steps / 1300, 2),
                    logged_at=activity_ts,
                    source_type="wearable",
                    recorded_at=activity_ts,
                    source_device="demo_seed",
                )
                tracking_db.add(activity_log)
                stats.activity_logs += 1

                vitals_ts = _to_datetime(day_date, 9, 0)
                vitals_log = VitalsLog(
                    user_id=user.id,
                    heart_rate=_stress_to_heart_rate(stress, steps),
                    systolic_bp=systolic_bp,
                    diastolic_bp=_systolic_to_diastolic(systolic_bp),
                    spo2=float(_clamp(99 - (1 if stress == "high" else 0), 94, 99)),
                    temperature_c=36.6,
                    blood_glucose_mg_dl=float(fasting_sugar),
                    logged_at=vitals_ts,
                    source_type="wearable",
                    recorded_at=vitals_ts,
                    source_device="demo_seed",
                )
                tracking_db.add(vitals_log)
                stats.vitals_logs += 1

                hydration = HydrationLog(
                    user_id=user.id,
                    amount_ml=int(_clamp(1800 + (steps // 20) - (120 if stress == "high" else 0), 1300, 3400)),
                    logged_at=_to_datetime(day_date, 20, 10),
                )
                tracking_db.add(hydration)
                stats.hydration_logs += 1

                if fasting_sugar >= 120:
                    note = f"Fasting sugar elevated ({fasting_sugar})"
                    tracking_db.add(
                        RiskAssessment(
                            user_id=user.id,
                            risk_type="diabetes_daily_signal",
                            risk_level="Medium",
                            summary=note,
                            generated_at=_to_datetime(day_date, 9, 30),
                        )
                    )
                    stats.risk_assessments += 1

                if index == len(daily_checkins) - 1:
                    if not tracking_db.scalar(select(NutritionGoal).where(NutritionGoal.user_id == user.id)):
                        tracking_db.add(
                            NutritionGoal(
                                user_id=user.id,
                                calorie_target=2200 if overall_risk.lower() != "high" else 2000,
                                protein_target_g=120,
                                carbs_target_g=260,
                                fat_target_g=70,
                                water_target_ml=2500,
                            )
                        )

            meal_types = ["Breakfast", "Lunch", "Dinner", "Snack"]
            for idx, meal in enumerate(food_log):
                day_date = date.fromisoformat(str(meal["date"]))
                status = str(meal.get("status", "Moderate"))
                calories, protein, carbs, fat, sodium = _meal_macros_by_status(status)
                meal_type = meal_types[idx % len(meal_types)]

                tracking_db.add(
                    MealLog(
                        user_id=user.id,
                        meal_type=meal_type,
                        food_name=str(meal.get("dish", "Meal")),
                        calories=calories,
                        protein_g=protein,
                        carbs_g=carbs,
                        fat_g=fat,
                        sodium_mg=sodium,
                        notes=f"{status}: {meal.get('reason', '')}",
                        logged_at=_to_datetime(day_date, 13, 10),
                    )
                )
                stats.meal_logs += 1

                tracking_db.add(
                    RestaurantInteraction(
                        user_id=user.id,
                        restaurant_name=str(meal.get("restaurant", "Unknown")),
                        action=f"menu_{status.lower()}",
                        query_text="seeded demo data",
                        dish_name=str(meal.get("dish", "")),
                        impact_label=status.lower(),
                        created_at=_to_datetime(day_date, 13, 15),
                    )
                )
                stats.restaurant_logs += 1

            for risk_type, risk_payload in risk_map.items():
                if not isinstance(risk_payload, dict):
                    continue
                level, summary = _build_risk_summary(risk_type, risk_payload)
                tracking_db.add(
                    RiskAssessment(
                        user_id=user.id,
                        risk_type=risk_type,
                        risk_level=level,
                        summary=summary,
                        generated_at=datetime.now(UTC),
                    )
                )
                stats.risk_assessments += 1

            aqi_payload = risk_map.get("aqi_risk")
            if isinstance(aqi_payload, dict):
                aqi_value = int(aqi_payload.get("aqi", 90))
                tracking_db.add(
                    AqiSnapshot(
                        user_id=user.id,
                        city="Delhi",
                        aqi_value=aqi_value,
                        category=_aqi_category(aqi_value),
                        notes=str(aqi_payload.get("advice", "")),
                        captured_at=datetime.now(UTC),
                    )
                )
                stats.aqi_snapshots += 1

            tracking_db.commit()

        print("Demo data import completed.")
        print(f"Users processed: {stats.users_processed}")
        print(f"Users missing (create account first): {stats.users_missing}")
        if missing_emails:
            print("Missing emails:")
            for email in missing_emails:
                print(f"  - {email}")
        print(f"Sleep logs inserted: {stats.sleep_logs}")
        print(f"Activity logs inserted: {stats.activity_logs}")
        print(f"Vitals logs inserted: {stats.vitals_logs}")
        print(f"Hydration logs inserted: {stats.hydration_logs}")
        print(f"Meal logs inserted: {stats.meal_logs}")
        print(f"Restaurant logs inserted: {stats.restaurant_logs}")
        print(f"Risk assessments inserted: {stats.risk_assessments}")
        print(f"AQI snapshots inserted: {stats.aqi_snapshots}")
    finally:
        core_db.close()
        tracking_db.close()


if __name__ == "__main__":
    main()
