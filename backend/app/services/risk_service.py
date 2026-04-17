import json
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.dish_nutrition import MealLog, RestaurantInteraction
from app.models.risk_assessment import ActivityLog, FeatureEvent, RiskAssessment, SleepLog, VitalsLog
from app.schemas.risk import (
    ActivityLogCreate,
    FeatureEventCreate,
    InstantAlertCreate,
    InstantAlertHistoryResponse,
    InstantAlertResponse,
    InstantAlertScore,
    RiskAssessmentCreate,
    SleepLogCreate,
    VitalsLogCreate,
    WearableSyncCreate,
    WearableSyncResponse,
)


def create_sleep_log(db: Session, user_id: int, payload: SleepLogCreate) -> SleepLog:
    log = SleepLog(user_id=user_id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def create_activity_log(db: Session, user_id: int, payload: ActivityLogCreate) -> ActivityLog:
    log = ActivityLog(user_id=user_id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def create_vitals_log(db: Session, user_id: int, payload: VitalsLogCreate) -> VitalsLog:
    log = VitalsLog(user_id=user_id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def create_feature_event(db: Session, user_id: int, payload: FeatureEventCreate) -> FeatureEvent:
    event = FeatureEvent(user_id=user_id, **payload.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def create_risk_assessment(db: Session, user_id: int, payload: RiskAssessmentCreate) -> RiskAssessment:
    assessment = RiskAssessment(user_id=user_id, **payload.model_dump())
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


def latest_overview(db: Session, user_id: int) -> dict:
    latest_sleep = db.scalar(select(SleepLog).where(SleepLog.user_id == user_id).order_by(SleepLog.created_at.desc()))
    latest_activity = db.scalar(select(ActivityLog).where(ActivityLog.user_id == user_id).order_by(ActivityLog.logged_at.desc()))
    latest_vitals = db.scalar(select(VitalsLog).where(VitalsLog.user_id == user_id).order_by(VitalsLog.logged_at.desc()))
    latest_food = db.scalar(
        select(MealLog)
        .where(
            MealLog.user_id == user_id,
            MealLog.meal_type == "Restaurant",
        )
        .order_by(MealLog.logged_at.desc())
    )
    latest_choice = db.scalar(
        select(RestaurantInteraction)
        .where(
            RestaurantInteraction.user_id == user_id,
            RestaurantInteraction.action == "choose_dish",
        )
        .order_by(RestaurantInteraction.created_at.desc())
    )
    alert_rows = db.execute(
        select(RestaurantInteraction.impact_label, func.count(RestaurantInteraction.id))
        .where(
            RestaurantInteraction.user_id == user_id,
            RestaurantInteraction.action == "choose_dish",
        )
        .group_by(RestaurantInteraction.impact_label)
    ).all()
    alert_counts = {"green": 0, "yellow": 0, "red": 0}
    for label, count in alert_rows:
        key = (label or "").strip().lower()
        if key in alert_counts:
            alert_counts[key] = int(count)

    sleep_payload = (
        {
            "sleep_date": latest_sleep.sleep_date,
            "duration_minutes": latest_sleep.duration_minutes,
            "quality_score": latest_sleep.quality_score,
        }
        if latest_sleep
        else None
    )
    activity_payload = (
        {
            "steps": latest_activity.steps,
            "workout_minutes": latest_activity.workout_minutes,
        }
        if latest_activity
        else None
    )
    vitals_payload = (
        {
            "heart_rate": latest_vitals.heart_rate,
            "systolic_bp": latest_vitals.systolic_bp,
        }
        if latest_vitals
        else None
    )
    food_payload = {
        "latest_item": latest_food.food_name if latest_food else None,
        "latest_logged_at": latest_food.logged_at if latest_food else None,
        "latest_calories": latest_food.calories if latest_food else None,
        "latest_sodium_mg": latest_food.sodium_mg if latest_food else None,
        "latest_note": latest_food.notes if latest_food else None,
        "latest_alert": latest_choice.impact_label if latest_choice else None,
        "latest_dish_name": latest_choice.dish_name if latest_choice else None,
        "latest_restaurant_name": latest_choice.restaurant_name if latest_choice else None,
        "latest_choice_at": latest_choice.created_at if latest_choice else None,
        "alert_counts": alert_counts,
        "recent_choices": sum(alert_counts.values()),
    }

    return {
        "sleep": sleep_payload,
        "activity": activity_payload,
        "vitals": vitals_payload,
        "food": food_payload,
    }


def _safe_normalized(value: str | None) -> str:
    return (value or "").strip().lower()


def _risk_level_from_percent(risk_percent: float) -> str:
    if risk_percent >= 70:
        return "High"
    if risk_percent >= 40:
        return "Medium"
    return "Low"


def _clamp_percent(value: float) -> float:
    return float(max(3.0, min(97.0, round(value, 1))))


def _build_instant_alert_scores(payload: InstantAlertCreate) -> dict[str, InstantAlertScore]:
    age = payload.age or 30
    systolic = payload.systolic_bp or 120
    diastolic = payload.diastolic_bp or 80
    heart_rate = payload.heart_rate or 78
    spo2 = payload.spo2 or 98
    glucose = payload.glucose or 100
    cholesterol = payload.cholesterol or 180
    aqi = payload.aqi or 80

    bmi = 24.0
    if payload.height_cm and payload.weight_kg and payload.height_cm > 0:
        bmi = payload.weight_kg / ((payload.height_cm / 100) ** 2)

    smoker = _safe_normalized(payload.smoker)
    chest_pain = _safe_normalized(payload.chest_pain)
    breath_shortness = _safe_normalized(payload.breath_shortness)
    wheezing = _safe_normalized(payload.wheezing)
    cough = _safe_normalized(payload.cough)
    stress = _safe_normalized(payload.stress)
    activity = _safe_normalized(payload.activity)
    family_heart = _safe_normalized(payload.family_heart_history)
    family_asthma = _safe_normalized(payload.family_asthma_history)
    family_diabetes = _safe_normalized(payload.family_diabetes_history)

    heart = 10.0
    heart_reasons: list[str] = []
    if age >= 45:
        heart += 12
        heart_reasons.append("Age above 45 raises baseline heart risk.")
    if systolic >= 140 or diastolic >= 90:
        heart += 20
        heart_reasons.append("High blood pressure pattern detected.")
    if cholesterol >= 240:
        heart += 14
        heart_reasons.append("High cholesterol increases cardiovascular load.")
    if smoker in {"yes", "daily", "occasionally"}:
        heart += 15
        heart_reasons.append("Smoking behavior is a major risk factor.")
    if chest_pain in {"mild", "moderate", "severe"}:
        heart += {"mild": 8, "moderate": 15, "severe": 24}[chest_pain]
        heart_reasons.append("Chest pain symptoms raise acute risk.")
    if breath_shortness in {"mild", "moderate", "severe"}:
        heart += {"mild": 5, "moderate": 10, "severe": 16}[breath_shortness]
        heart_reasons.append("Breath-shortness may indicate cardio stress.")
    if family_heart == "yes":
        heart += 12
        heart_reasons.append("Family heart history contributes to risk.")
    if stress in {"medium", "high"}:
        heart += 4 if stress == "medium" else 8
        heart_reasons.append("Stress can worsen cardiovascular markers.")

    asthma = 8.0
    asthma_reasons: list[str] = []
    if wheezing == "yes":
        asthma += 22
        asthma_reasons.append("Wheezing strongly correlates with airway irritation.")
    if breath_shortness in {"mild", "moderate", "severe"}:
        asthma += {"mild": 6, "moderate": 12, "severe": 20}[breath_shortness]
        asthma_reasons.append("Breath-shortness may indicate breathing difficulty.")
    if cough in {"mild", "persistent"}:
        asthma += 7 if cough == "mild" else 14
        asthma_reasons.append("Cough severity affects respiratory risk.")
    if aqi >= 150:
        asthma += 18
        asthma_reasons.append("Poor AQI level can trigger respiratory stress.")
    elif aqi >= 100:
        asthma += 9
        asthma_reasons.append("Moderate AQI elevates asthma risk.")
    if family_asthma == "yes":
        asthma += 12
        asthma_reasons.append("Family asthma history detected.")
    if smoker in {"yes", "daily", "occasionally"}:
        asthma += 8
        asthma_reasons.append("Smoking can aggravate respiratory pathways.")

    diabetes = 9.0
    diabetes_reasons: list[str] = []
    if glucose >= 180:
        diabetes += 28
        diabetes_reasons.append("Very high glucose is a strong diabetes signal.")
    elif glucose >= 126:
        diabetes += 18
        diabetes_reasons.append("Glucose above diabetic threshold range.")
    elif glucose >= 110:
        diabetes += 10
        diabetes_reasons.append("Elevated glucose above normal range.")
    if bmi >= 30:
        diabetes += 18
        diabetes_reasons.append("BMI in obesity range raises insulin resistance risk.")
    elif bmi >= 25:
        diabetes += 9
        diabetes_reasons.append("BMI above normal can increase diabetes risk.")
    if activity == "low":
        diabetes += 8
        diabetes_reasons.append("Low activity level contributes to diabetes risk.")
    if family_diabetes == "yes":
        diabetes += 16
        diabetes_reasons.append("Family diabetes history detected.")
    if stress == "high":
        diabetes += 5
        diabetes_reasons.append("High stress may worsen glucose regulation.")

    hypertension = 8.0
    hypertension_reasons: list[str] = []
    if systolic >= 160 or diastolic >= 100:
        hypertension += 30
        hypertension_reasons.append("Severe blood pressure elevation observed.")
    elif systolic >= 140 or diastolic >= 90:
        hypertension += 20
        hypertension_reasons.append("High blood pressure observed.")
    elif systolic >= 130 or diastolic >= 85:
        hypertension += 12
        hypertension_reasons.append("Borderline blood pressure elevation observed.")
    if age >= 40:
        hypertension += 8
        hypertension_reasons.append("Age contributes to BP sensitivity.")
    if bmi >= 30:
        hypertension += 10
        hypertension_reasons.append("Obesity increases hypertension risk.")
    if stress in {"medium", "high"}:
        hypertension += 5 if stress == "medium" else 10
        hypertension_reasons.append("Stress level influences blood pressure spikes.")
    if smoker in {"yes", "daily", "occasionally"}:
        hypertension += 6
        hypertension_reasons.append("Smoking can elevate vascular pressure.")
    if heart_rate >= 105:
        hypertension += 4
        hypertension_reasons.append("High resting heart rate linked with BP risk.")
    if spo2 < 92:
        hypertension += 6
        hypertension_reasons.append("Low oxygen saturation may indicate cardio-respiratory strain.")

    scores = {
        "heart_attack": _clamp_percent(heart),
        "asthma": _clamp_percent(asthma),
        "diabetes": _clamp_percent(diabetes),
        "hypertension": _clamp_percent(hypertension),
    }

    reasons_map = {
        "heart_attack": heart_reasons or ["No critical heart-risk pattern found from current input."],
        "asthma": asthma_reasons or ["No strong asthma-risk marker found from current input."],
        "diabetes": diabetes_reasons or ["No strong diabetes-risk marker found from current input."],
        "hypertension": hypertension_reasons or ["No strong hypertension-risk marker found from current input."],
    }

    return {
        key: InstantAlertScore(
            risk_percent=value,
            risk_level=_risk_level_from_percent(value),
            reasons=reasons_map[key],
        )
        for key, value in scores.items()
    }


def _serialize_instant_alert_summary(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False)


def _deserialize_instant_alert_summary(raw: str) -> dict | None:
    try:
        value = json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return None
    if isinstance(value, dict):
        return value
    return None


def create_instant_alert(db: Session, user_id: int, payload: InstantAlertCreate) -> InstantAlertResponse:
    scores = _build_instant_alert_scores(payload)
    top_key, top_score = max(scores.items(), key=lambda item: item[1].risk_percent)
    overall_risk = _risk_level_from_percent(top_score.risk_percent)
    summary = (
        f"Top risk signal: {top_key.replace('_', ' ').title()} at "
        f"{top_score.risk_percent:.0f}% ({top_score.risk_level})."
    )

    summary_payload = {
        "overall_risk": overall_risk,
        "summary": summary,
        "scores": {key: score.model_dump() for key, score in scores.items()},
        "input": payload.model_dump(),
    }

    saved = RiskAssessment(
        user_id=user_id,
        risk_type="instant_alert",
        risk_level=overall_risk,
        summary=_serialize_instant_alert_summary(summary_payload),
        generated_at=datetime.now(UTC),
    )
    db.add(saved)
    db.commit()
    db.refresh(saved)

    return InstantAlertResponse(
        id=saved.id,
        overall_risk=overall_risk,
        summary=summary,
        created_at=saved.generated_at,
        scores=scores,
    )


def get_instant_alert_history(db: Session, user_id: int, limit: int = 15) -> InstantAlertHistoryResponse:
    rows = list(
        db.scalars(
            select(RiskAssessment)
            .where(RiskAssessment.user_id == user_id, RiskAssessment.risk_type == "instant_alert")
            .order_by(RiskAssessment.generated_at.desc())
            .limit(max(1, min(limit, 100)))
        ).all()
    )

    items: list[InstantAlertResponse] = []
    for row in rows:
        parsed = _deserialize_instant_alert_summary(row.summary or "")
        parsed_scores = (parsed or {}).get("scores", {}) if isinstance(parsed, dict) else {}

        scores: dict[str, InstantAlertScore] = {}
        for key in ("heart_attack", "asthma", "diabetes", "hypertension"):
            score_raw = parsed_scores.get(key, {}) if isinstance(parsed_scores, dict) else {}
            risk_percent = float(score_raw.get("risk_percent", 0))
            score = InstantAlertScore(
                risk_percent=_clamp_percent(risk_percent),
                risk_level=str(score_raw.get("risk_level") or _risk_level_from_percent(risk_percent)),
                reasons=list(score_raw.get("reasons") or ["No details available."]),
            )
            scores[key] = score

        summary = str((parsed or {}).get("summary") or row.summary or "Instant alert generated.")
        overall = str((parsed or {}).get("overall_risk") or row.risk_level or "Low")

        items.append(
            InstantAlertResponse(
                id=row.id,
                overall_risk=overall,
                summary=summary,
                created_at=row.generated_at,
                scores=scores,
            )
        )

    return InstantAlertHistoryResponse(items=items)


def sync_wearable_data(db: Session, user_id: int, payload: WearableSyncCreate) -> WearableSyncResponse:
    synced = {"activity": False, "vitals": False, "sleep": False}

    if payload.steps is not None or payload.workout_minutes is not None or payload.calories_burned is not None or payload.distance_km is not None:
        activity = ActivityLog(
            user_id=user_id,
            steps=payload.steps or 0,
            workout_minutes=payload.workout_minutes or 0,
            calories_burned=payload.calories_burned or 0,
            distance_km=payload.distance_km,
            logged_at=datetime.now(UTC),
        )
        db.add(activity)
        synced["activity"] = True

    if (
        payload.heart_rate is not None
        or payload.systolic_bp is not None
        or payload.diastolic_bp is not None
        or payload.spo2 is not None
        or payload.temperature_c is not None
    ):
        vitals = VitalsLog(
            user_id=user_id,
            heart_rate=payload.heart_rate,
            systolic_bp=payload.systolic_bp,
            diastolic_bp=payload.diastolic_bp,
            spo2=payload.spo2,
            temperature_c=payload.temperature_c,
            logged_at=datetime.now(UTC),
        )
        db.add(vitals)
        synced["vitals"] = True

    if payload.sleep_minutes is not None:
        sleep = SleepLog(
            user_id=user_id,
            sleep_date=date.today(),
            duration_minutes=payload.sleep_minutes,
            quality_score=payload.sleep_quality,
            created_at=datetime.now(UTC),
        )
        db.add(sleep)
        synced["sleep"] = True

    metadata = payload.model_dump()
    event = FeatureEvent(
        user_id=user_id,
        feature="wearable",
        action="sync",
        metadata_json=json.dumps(metadata, ensure_ascii=False),
        created_at=datetime.now(UTC),
    )
    db.add(event)
    db.commit()

    if not any(synced.values()):
        return WearableSyncResponse(
            message="Wearable sync logged. No numeric sensor values were provided.",
            synced=synced,
        )

    return WearableSyncResponse(
        message="Wearable data synced successfully.",
        synced=synced,
    )
