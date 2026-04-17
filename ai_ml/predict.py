from __future__ import annotations

from pathlib import Path
from threading import Lock
from typing import Any

import joblib
import numpy as np
import pandas as pd

_MODEL_DIR = Path(__file__).resolve().parent / "models"
_DIABETES_MODEL_CANDIDATE_PATHS = (
    _MODEL_DIR / "diabetes_model.pkl",
    _MODEL_DIR / "diabetes" / "diabetes_model.pkl",
)
_HEART_MODEL_CANDIDATE_PATHS = (
    _MODEL_DIR / "heart_model.pkl",
    _MODEL_DIR / "heart" / "heart_model.pkl",
)

_MODEL_LOCK = Lock()
_MODELS_READY = False
_DIABETES_MODEL: Any | None = None
_HEART_MODEL: Any | None = None

_RISK_ORDER = {"Low": 1, "Medium": 2, "High": 3}


def _to_float(value: Any, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _to_int(value: Any, default: int) -> int:
    if value is None:
        return default
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _probability_to_level(probability: float) -> str:
    if probability >= 0.66:
        return "High"
    if probability >= 0.33:
        return "Medium"
    return "Low"


def _safe_load_model_from_candidates(paths: tuple[Path, ...]) -> Any | None:
    for path in paths:
        if not path.exists():
            continue
        try:
            return joblib.load(path)
        except Exception:
            continue
    return None


def warmup_models() -> dict[str, bool]:
    global _MODELS_READY, _DIABETES_MODEL, _HEART_MODEL

    if _MODELS_READY:
        return {
            "diabetes_loaded": _DIABETES_MODEL is not None,
            "heart_loaded": _HEART_MODEL is not None,
        }

    with _MODEL_LOCK:
        if not _MODELS_READY:
            _DIABETES_MODEL = _safe_load_model_from_candidates(_DIABETES_MODEL_CANDIDATE_PATHS)
            _HEART_MODEL = _safe_load_model_from_candidates(_HEART_MODEL_CANDIDATE_PATHS)
            _MODELS_READY = True

    return {
        "diabetes_loaded": _DIABETES_MODEL is not None,
        "heart_loaded": _HEART_MODEL is not None,
    }


def _predict_probability(model: Any | None, features: pd.DataFrame) -> float | None:
    if model is None:
        return None

    try:
        probabilities = model.predict_proba(features)
        if probabilities.shape[1] >= 2:
            probability = float(probabilities[0][1])
        else:
            probability = float(probabilities[0][0])
        return float(np.clip(probability, 0.0, 1.0))
    except Exception:
        return None


def _heart_value_for_feature(feature_name: str, values: dict[str, float]) -> float:
    normalized = feature_name.lower().replace("_", "")
    aliases = {
        "age": "age",
        "sex": "sex",
        "cp": "cp",
        "chestpaintype": "cp",
        "trestbps": "trestbps",
        "restingbloodpressure": "trestbps",
        "chol": "chol",
        "cholesterol": "chol",
        "fbs": "fbs",
        "fastingbloodsugar": "fbs",
        "thalach": "thalach",
        "thalachh": "thalach",
        "maxheartrate": "thalach",
    }
    source_key = aliases.get(normalized)
    if source_key is None:
        return 0.0
    return float(values[source_key])


def predict_diabetes(
    glucose: float | None = None,
    bmi: float | None = None,
    age: int | None = None,
    bp: float | None = None,
    insulin: float | None = None,
    pregnancies: int | None = None,
    skin_thickness: float | None = None,
    dpf: float | None = None,
) -> dict[str, Any]:
    warmup_models()

    glucose_value = _to_float(glucose, 100.0)
    bmi_value = _to_float(bmi, 24.0)
    age_value = _to_int(age, 30)
    bp_value = _to_float(bp, 120.0)
    insulin_value = _to_float(insulin, 80.0)
    pregnancies_value = _to_int(pregnancies, 0)
    skin_thickness_value = _to_float(skin_thickness, 20.0)
    dpf_value = _to_float(dpf, 0.5)

    reasons: list[str] = []
    if glucose_value > 140:
        reasons.append("High glucose detected")
    if bmi_value > 30:
        reasons.append("High BMI")
    if age_value > 45:
        reasons.append("Age factor")
    if not reasons:
        reasons.append("No major diabetes risk markers detected")

    features = pd.DataFrame(
        [
            {
                "Pregnancies": pregnancies_value,
                "Glucose": glucose_value,
                "BloodPressure": bp_value,
                "SkinThickness": skin_thickness_value,
                "Insulin": insulin_value,
                "BMI": bmi_value,
                "DiabetesPedigreeFunction": dpf_value,
                "Age": age_value,
            }
        ]
    )

    probability = _predict_probability(_DIABETES_MODEL, features)
    if probability is None:
        probability = 0.10
        if glucose_value > 140:
            probability += 0.35
        if bmi_value > 30:
            probability += 0.25
        if age_value > 45:
            probability += 0.15
        probability = float(np.clip(probability, 0.0, 0.99))

    return {
        "probability": round(probability, 2),
        "level": _probability_to_level(probability),
        "reasons": reasons,
    }


def predict_heart(
    age: int | None = None,
    sex: int | None = None,
    cp: int | None = None,
    trestbps: float | None = None,
    chol: float | None = None,
    fbs: int | None = None,
    thalach: float | None = None,
) -> dict[str, Any]:
    warmup_models()

    values = {
        "age": float(_to_int(age, 40)),
        "sex": float(_to_int(sex, 0)),
        "cp": float(_to_int(cp, 0)),
        "trestbps": float(_to_float(trestbps, 120.0)),
        "chol": float(_to_float(chol, 180.0)),
        "fbs": float(_to_int(fbs, 0)),
        "thalach": float(_to_float(thalach, 150.0)),
    }

    reasons: list[str] = []
    if values["trestbps"] > 140:
        reasons.append("High blood pressure")
    if values["chol"] > 240:
        reasons.append("High cholesterol")
    if values["age"] > 50:
        reasons.append("Age factor")
    if not reasons:
        reasons.append("No major heart risk markers detected")

    if _HEART_MODEL is not None and hasattr(_HEART_MODEL, "feature_names_in_"):
        feature_names = list(_HEART_MODEL.feature_names_in_)
        feature_row = {name: _heart_value_for_feature(name, values) for name in feature_names}
        features = pd.DataFrame([feature_row], columns=feature_names)
    else:
        features = pd.DataFrame([values])

    probability = _predict_probability(_HEART_MODEL, features)
    if probability is None:
        probability = 0.10
        if values["trestbps"] > 140:
            probability += 0.30
        if values["chol"] > 240:
            probability += 0.30
        if values["age"] > 50:
            probability += 0.15
        probability = float(np.clip(probability, 0.0, 0.99))

    return {
        "probability": round(probability, 2),
        "level": _probability_to_level(probability),
        "reasons": reasons,
    }


def score_hypertension(
    systolic_bp: float | None = None,
    bmi: float | None = None,
    activity: str | None = None,
    stress: str | None = None,
) -> dict[str, Any]:
    systolic_value = _to_float(systolic_bp, 120.0)
    bmi_value = _to_float(bmi, 24.0)
    activity_value = str(activity or "moderate").strip().lower()
    stress_value = str(stress or "medium").strip().lower()

    score = 0
    reasons: list[str] = []

    if systolic_value >= 140:
        score += 4
        reasons.append("High systolic blood pressure")
    elif systolic_value >= 120:
        score += 2
        reasons.append("Elevated systolic blood pressure")

    if bmi_value > 30:
        score += 2
        reasons.append("High BMI")

    if activity_value == "low":
        score += 2
        reasons.append("Low activity level")

    if stress_value == "high":
        score += 2
        reasons.append("High stress level")

    if score <= 3:
        level = "Low"
    elif score <= 7:
        level = "Medium"
    else:
        level = "High"

    if not reasons:
        reasons.append("No major hypertension risk markers detected")

    return {
        "level": level,
        "score": score,
        "reasons": reasons,
    }


def score_obesity(bmi: float | None = None) -> dict[str, Any]:
    bmi_value = _to_float(bmi, 24.0)
    if bmi_value < 25:
        level = "Low"
    elif bmi_value < 30:
        level = "Medium"
    else:
        level = "High"

    return {
        "level": level,
        "bmi": round(bmi_value, 2),
    }


def score_aqi_risk(aqi: float | None = None, user_overall_risk: str | None = None) -> dict[str, Any]:
    aqi_value = _to_float(aqi, 80.0)
    normalized_overall_risk = str(user_overall_risk or "Low").strip().title()
    if normalized_overall_risk not in _RISK_ORDER:
        normalized_overall_risk = "Low"

    if aqi_value <= 100:
        level = "Low"
    elif aqi_value <= 200:
        level = "Medium"
    else:
        level = "High"

    if aqi_value > 200 and normalized_overall_risk == "High":
        advice = "Avoid outdoor activity"
    elif aqi_value > 200:
        advice = "Use a mask and limit prolonged outdoor exposure"
    elif aqi_value > 100:
        advice = "Monitor AQI before outdoor workouts"
    else:
        advice = "Air quality is acceptable for regular activity"

    return {
        "level": level,
        "aqi": round(aqi_value, 2),
        "advice": advice,
    }


__all__ = [
    "predict_diabetes",
    "predict_heart",
    "score_hypertension",
    "score_obesity",
    "score_aqi_risk",
    "warmup_models",
]
