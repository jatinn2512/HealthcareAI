"""Priority-based monitoring fusion, trends, and rule-based risk summaries."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.monitoring_sources import human_source_label, normalize_source_type, source_priority
from app.models.risk_assessment import FeatureEvent, VitalsLog


def _effective_vitals_ts(row: VitalsLog) -> datetime:
    raw = row.recorded_at or row.logged_at
    if raw.tzinfo is None:
        return raw.replace(tzinfo=UTC)
    return raw.astimezone(UTC)


def _pick_best_row(rows: list[VitalsLog], predicate) -> VitalsLog | None:
    candidates = [r for r in rows if predicate(r)]
    if not candidates:
        return None
    return max(candidates, key=lambda r: (source_priority(r.source_type), _effective_vitals_ts(r)))


def build_monitoring_fusion(db: Session, user_id: int) -> dict[str, Any]:
    cutoff = datetime.now(UTC) - timedelta(days=120)
    rows = list(
        db.scalars(
            select(VitalsLog)
            .where(VitalsLog.user_id == user_id, VitalsLog.logged_at >= cutoff)
            .order_by(VitalsLog.logged_at.desc())
            .limit(400)
        ).all()
    )

    bp_row = _pick_best_row(rows, lambda r: r.systolic_bp is not None and r.diastolic_bp is not None)
    hr_row = _pick_best_row(rows, lambda r: r.heart_rate is not None)
    spo2_row = _pick_best_row(rows, lambda r: r.spo2 is not None)
    temp_row = _pick_best_row(rows, lambda r: r.temperature_c is not None)
    glucose_row = _pick_best_row(rows, lambda r: r.blood_glucose_mg_dl is not None)

    bp_display: str | None = None
    bp_source: str | None = None
    bp_ts: datetime | None = None
    if bp_row:
        bp_display = f"{bp_row.systolic_bp}/{bp_row.diastolic_bp}"
        bp_source = normalize_source_type(bp_row.source_type)
        bp_ts = _effective_vitals_ts(bp_row)

    hr_val = hr_row.heart_rate if hr_row else None
    hr_source = normalize_source_type(hr_row.source_type) if hr_row else None
    hr_ts = _effective_vitals_ts(hr_row) if hr_row else None

    spo2_val = spo2_row.spo2 if spo2_row else None
    spo2_source = normalize_source_type(spo2_row.source_type) if spo2_row else None
    spo2_ts = _effective_vitals_ts(spo2_row) if spo2_row else None

    temp_val = temp_row.temperature_c if temp_row else None
    temp_source = normalize_source_type(temp_row.source_type) if temp_row else None
    temp_ts = _effective_vitals_ts(temp_row) if temp_row else None

    glucose_val = glucose_row.blood_glucose_mg_dl if glucose_row else None
    glucose_source = normalize_source_type(glucose_row.source_type) if glucose_row else None
    glucose_ts = _effective_vitals_ts(glucose_row) if glucose_row else None

    timestamps = [t for t in (bp_ts, hr_ts, spo2_ts, temp_ts, glucose_ts) if t is not None]
    last_updated = max(timestamps).isoformat() if timestamps else None

    return {
        "bp": bp_display,
        "bp_source": bp_source,
        "bp_source_label": human_source_label(bp_source) if bp_source else None,
        "hr": hr_val,
        "hr_source": hr_source,
        "hr_source_label": human_source_label(hr_source) if hr_source else None,
        "spo2": spo2_val,
        "spo2_source": spo2_source,
        "spo2_source_label": human_source_label(spo2_source) if spo2_source else None,
        "temperature_c": temp_val,
        "temperature_c_source": temp_source,
        "temperature_c_source_label": human_source_label(temp_source) if temp_source else None,
        "blood_glucose_mg_dl": glucose_val,
        "blood_glucose_source": glucose_source,
        "blood_glucose_source_label": human_source_label(glucose_source) if glucose_source else None,
        "last_updated": last_updated,
    }


def build_vitals_trends(db: Session, user_id: int) -> dict[str, Any]:
    now = datetime.now(UTC)
    week_ago = now - timedelta(days=7)
    rows = list(
        db.scalars(
            select(VitalsLog)
            .where(VitalsLog.user_id == user_id)
            .order_by(VitalsLog.logged_at.desc())
            .limit(80)
        ).all()
    )

    with_bp = [r for r in rows if r.systolic_bp is not None and r.diastolic_bp is not None]
    with_bp_sorted = sorted(with_bp, key=_effective_vitals_ts)
    last3 = with_bp_sorted[-3:]
    last3_payload = [
        {
            "systolic_bp": r.systolic_bp,
            "diastolic_bp": r.diastolic_bp,
            "recorded_at": (_effective_vitals_ts(r)).isoformat(),
            "source_type": normalize_source_type(r.source_type),
            "source_label": human_source_label(r.source_type),
        }
        for r in last3
    ]

    week_bp = [r for r in with_bp if _effective_vitals_ts(r) >= week_ago]
    bp_7d_avg: str | None = None
    if week_bp:
        s_avg = sum(r.systolic_bp or 0 for r in week_bp) / len(week_bp)
        d_avg = sum(r.diastolic_bp or 0 for r in week_bp) / len(week_bp)
        bp_7d_avg = f"{round(s_avg)}/{round(d_avg)}"

    bp_trend = "insufficient"
    if len(last3) >= 3:
        s_vals = [r.systolic_bp or 0 for r in last3]
        if s_vals[2] > s_vals[1] > s_vals[0]:
            bp_trend = "rising"
        elif s_vals[2] < s_vals[1] < s_vals[0]:
            bp_trend = "falling"
        else:
            bp_trend = "stable"
    elif len(last3) >= 2:
        s_vals = [r.systolic_bp or 0 for r in last3]
        if s_vals[1] > s_vals[0] + 3:
            bp_trend = "rising"
        elif s_vals[1] < s_vals[0] - 3:
            bp_trend = "falling"
        else:
            bp_trend = "stable"

    glucose_recent = [r for r in rows if r.blood_glucose_mg_dl is not None][:5]
    glucose_high_streak = sum(1 for r in glucose_recent if (r.blood_glucose_mg_dl or 0) > 140)

    return {
        "vitals_bp_last3": last3_payload,
        "bp_7d_avg": bp_7d_avg,
        "bp_trend": bp_trend,
        "glucose_high_readings_last5": glucose_high_streak,
    }


def _bmi(height_cm: float | None, weight_kg: float | None) -> float | None:
    if not height_cm or not weight_kg or height_cm <= 0:
        return None
    h_m = height_cm / 100.0
    return round(weight_kg / (h_m * h_m), 1)


def compute_rule_based_risk(
    monitoring: dict[str, Any],
    trends: dict[str, Any],
    *,
    height_cm: float | None,
    weight_kg: float | None,
) -> dict[str, Any]:
    reasons: list[str] = []

    bp = monitoring.get("bp") or ""
    sys_v: int | None = None
    dia_v: int | None = None
    if isinstance(bp, str) and "/" in bp:
        parts = bp.split("/", 1)
        try:
            sys_v = int(parts[0].strip())
            dia_v = int(parts[1].strip())
        except (ValueError, IndexError):
            sys_v, dia_v = None, None

    hr = monitoring.get("hr")
    sugar = monitoring.get("blood_glucose_mg_dl")

    heart_score = 0
    if sys_v is not None and dia_v is not None:
        if sys_v > 140 or dia_v > 90:
            heart_score += 2
            reasons.append("Blood pressure above common risk threshold (140/90).")
        elif sys_v > 130 or dia_v > 85:
            heart_score += 1
            reasons.append("Blood pressure mildly elevated.")
    if isinstance(hr, (int, float)) and hr > 100:
        heart_score += 1
        reasons.append("Resting heart rate above 100 bpm.")
    bmi = _bmi(height_cm, weight_kg)
    if bmi is not None and bmi > 25:
        heart_score += 1
        reasons.append(f"BMI {bmi} above 25.")

    if trends.get("bp_trend") == "rising" and sys_v is not None and sys_v >= 130:
        heart_score += 1
        reasons.append("Rising BP trend over recent readings.")

    if heart_score >= 3:
        heart_risk = "High"
    elif heart_score >= 1:
        heart_risk = "Medium"
    else:
        heart_risk = "Low"

    diabetes_score = 0
    if isinstance(sugar, (int, float)):
        if sugar > 180:
            diabetes_score += 3
            reasons.append("Glucose very high (>180 mg/dL).")
        elif sugar > 140:
            diabetes_score += 2
            reasons.append("Glucose above 140 mg/dL.")
        elif sugar > 126:
            diabetes_score += 1
            reasons.append("Glucose in elevated range.")

    high_streak = int(trends.get("glucose_high_readings_last5") or 0)
    if high_streak >= 3:
        diabetes_score += 2
        reasons.append("Repeated high glucose readings.")

    if bmi is not None and bmi >= 30:
        diabetes_score += 1
        reasons.append("BMI in obesity range increases metabolic risk.")

    if diabetes_score >= 4:
        diabetes_risk = "Very High"
    elif diabetes_score >= 2:
        diabetes_risk = "High"
    elif diabetes_score == 1:
        diabetes_risk = "Medium"
    else:
        diabetes_risk = "Low"

    reason_text = "; ".join(reasons) if reasons else "No strong rule-based risk drivers from current signals."

    return {
        "heart_risk": heart_risk,
        "diabetes_risk": diabetes_risk,
        "reason": reason_text,
        "bmi": bmi,
    }


def build_data_quality_message(monitoring: dict[str, Any]) -> str:
    bp = monitoring.get("bp")
    hr = monitoring.get("hr")
    has_alt = isinstance(hr, (int, float)) or monitoring.get("spo2") is not None
    if not bp and has_alt:
        return "Insufficient BP data, using alternative indicators."
    if not bp and not has_alt:
        return "Limited vital sign data available; add a manual reading, instant alert, or lab report."
    return ""


def latest_symptoms_snippet(db: Session, user_id: int) -> str | None:
    row = db.scalar(
        select(FeatureEvent)
        .where(FeatureEvent.user_id == user_id, FeatureEvent.feature == "instant_alert", FeatureEvent.action == "symptoms")
        .order_by(FeatureEvent.created_at.desc())
        .limit(1)
    )
    if not row or not row.metadata_json:
        return None
    return row.metadata_json[:400]
