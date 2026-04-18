from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


SourceType = Literal["lab_report", "instant_alert", "manual", "wearable"]


class SleepLogCreate(BaseModel):
    sleep_date: date
    duration_minutes: int = Field(ge=0, le=1440)
    sleep_start: datetime | None = None
    sleep_end: datetime | None = None
    quality_score: int | None = Field(default=None, ge=0, le=100)
    source_type: SourceType = "wearable"
    recorded_at: datetime | None = None
    source_device: str | None = Field(default=None, max_length=120)


class ActivityLogCreate(BaseModel):
    steps: int = Field(ge=0)
    workout_minutes: int = Field(ge=0)
    calories_burned: int = Field(ge=0)
    distance_km: float | None = Field(default=None, ge=0)
    source_type: SourceType = "wearable"
    recorded_at: datetime | None = None
    source_device: str | None = Field(default=None, max_length=120)


class VitalsLogCreate(BaseModel):
    heart_rate: int | None = Field(default=None, ge=20, le=260)
    systolic_bp: int | None = Field(default=None, ge=60, le=250)
    diastolic_bp: int | None = Field(default=None, ge=40, le=180)
    spo2: float | None = Field(default=None, ge=50, le=100)
    temperature_c: float | None = Field(default=None, ge=30, le=45)
    blood_glucose_mg_dl: float | None = Field(default=None, ge=20, le=800)
    source_type: SourceType = "wearable"
    recorded_at: datetime | None = None
    source_device: str | None = Field(default=None, max_length=120)


class FeatureEventCreate(BaseModel):
    feature: str = Field(min_length=2, max_length=80)
    action: str = Field(min_length=2, max_length=80)
    metadata_json: str | None = None


class RiskAssessmentCreate(BaseModel):
    risk_type: str = Field(min_length=2, max_length=80)
    risk_level: str = Field(min_length=2, max_length=30)
    summary: str = Field(min_length=2)


class SleepLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sleep_date: date
    duration_minutes: int
    quality_score: int | None
    source_type: str = "wearable"
    recorded_at: datetime | None = None
    source_device: str | None = None
    created_at: datetime


class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    steps: int
    workout_minutes: int
    calories_burned: int
    distance_km: float | None
    source_type: str = "wearable"
    recorded_at: datetime | None = None
    source_device: str | None = None
    logged_at: datetime


class VitalsLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    heart_rate: int | None
    systolic_bp: int | None
    diastolic_bp: int | None
    spo2: float | None
    temperature_c: float | None
    blood_glucose_mg_dl: float | None = None
    source_type: str = "wearable"
    recorded_at: datetime | None = None
    source_device: str | None = None
    logged_at: datetime


class InstantAlertCreate(BaseModel):
    age: int | None = Field(default=None, ge=0, le=120)
    sex: int | None = Field(default=None, ge=0, le=1)
    height_cm: float | None = Field(default=None, ge=50, le=260)
    weight_kg: float | None = Field(default=None, ge=15, le=350)
    systolic_bp: int | None = Field(default=None, ge=50, le=300)
    diastolic_bp: int | None = Field(default=None, ge=30, le=200)
    heart_rate: int | None = Field(default=None, ge=20, le=260)
    spo2: float | None = Field(default=None, ge=50, le=100)
    glucose: float | None = Field(default=None, ge=20, le=800)
    cholesterol: float | None = Field(default=None, ge=50, le=600)
    aqi: int | None = Field(default=None, ge=0, le=600)
    activity: str = Field(default="na", max_length=30)
    stress: str = Field(default="na", max_length=30)
    smoker: str = Field(default="na", max_length=30)
    chest_pain: str = Field(default="na", max_length=30)
    breath_shortness: str = Field(default="na", max_length=30)
    wheezing: str = Field(default="na", max_length=30)
    cough: str = Field(default="na", max_length=30)
    family_heart_history: str = Field(default="na", max_length=30)
    family_asthma_history: str = Field(default="na", max_length=30)
    family_diabetes_history: str = Field(default="na", max_length=30)
    disability_type: str = Field(default="na", max_length=30)
    notes: str | None = None


class InstantAlertScore(BaseModel):
    risk_percent: float
    risk_level: str
    reasons: list[str]


class InstantAlertResponse(BaseModel):
    id: int
    overall_risk: str
    summary: str
    created_at: datetime
    scores: dict[str, InstantAlertScore]


class InstantAlertHistoryResponse(BaseModel):
    items: list[InstantAlertResponse]


class WearableSyncCreate(BaseModel):
    source_device: str = Field(default="smartwatch", max_length=80)
    steps: int | None = Field(default=None, ge=0)
    workout_minutes: int | None = Field(default=None, ge=0)
    calories_burned: int | None = Field(default=None, ge=0)
    distance_km: float | None = Field(default=None, ge=0)
    sleep_minutes: int | None = Field(default=None, ge=0, le=1440)
    sleep_quality: int | None = Field(default=None, ge=0, le=100)
    heart_rate: int | None = Field(default=None, ge=20, le=260)
    systolic_bp: int | None = Field(default=None, ge=50, le=300)
    diastolic_bp: int | None = Field(default=None, ge=30, le=200)
    spo2: float | None = Field(default=None, ge=50, le=100)
    temperature_c: float | None = Field(default=None, ge=30, le=45)


class WearableSyncResponse(BaseModel):
    message: str
    synced: dict[str, bool]


class LabReportIngestRequest(BaseModel):
    text: str = Field(min_length=3, max_length=50_000)
    recorded_at: datetime | None = None


class LabReportIngestResponse(BaseModel):
    vitals_log_id: int
    extracted: dict
    matched_snippets: list[str] | None = None
