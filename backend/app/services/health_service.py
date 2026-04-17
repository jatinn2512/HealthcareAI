from __future__ import annotations

import sys
from pathlib import Path
from typing import Iterable

from app.schemas.health import HealthRiskRequest, HealthRiskResponse

_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.append(str(_REPO_ROOT))

from ai_ml.predict import (  # noqa: E402
    predict_diabetes,
    predict_heart,
    score_aqi_risk,
    score_hypertension,
    score_obesity,
    warmup_models,
)

_RISK_PRIORITY = {"Low": 1, "Medium": 2, "High": 3}


def _highest_risk(levels: Iterable[str]) -> str:
    return max(levels, key=lambda level: _RISK_PRIORITY.get(level, 0))


def warmup_health_models() -> dict[str, bool]:
    return warmup_models()


def assess_health_risk(payload: HealthRiskRequest) -> HealthRiskResponse:
    diabetes = predict_diabetes(
        glucose=payload.glucose,
        bmi=payload.bmi,
        age=payload.age,
        bp=payload.bp,
        insulin=payload.insulin,
        pregnancies=payload.pregnancies,
        skin_thickness=payload.skin_thickness,
        dpf=payload.dpf,
    )
    heart = predict_heart(
        age=payload.age,
        sex=payload.sex,
        cp=payload.cp,
        trestbps=payload.bp,
        chol=payload.chol,
        fbs=payload.fbs,
        thalach=payload.thalach,
    )
    hypertension = score_hypertension(
        systolic_bp=payload.bp,
        bmi=payload.bmi,
        activity=payload.activity,
        stress=payload.stress,
    )
    obesity = score_obesity(bmi=payload.bmi)

    pre_aqi_overall_risk = _highest_risk(
        [
            diabetes["level"],
            heart["level"],
            hypertension["level"],
            obesity["level"],
        ]
    )
    aqi_risk = score_aqi_risk(aqi=payload.aqi, user_overall_risk=pre_aqi_overall_risk)

    overall_risk = _highest_risk(
        [
            diabetes["level"],
            heart["level"],
            hypertension["level"],
            obesity["level"],
            aqi_risk["level"],
        ]
    )

    return HealthRiskResponse(
        overall_risk=overall_risk,
        conditions={
            "diabetes": diabetes,
            "heart": heart,
            "hypertension": hypertension,
            "obesity": obesity,
            "aqi_risk": aqi_risk,
        },
    )
