from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

RiskLevel = Literal["Low", "Medium", "High"]


class HealthRiskRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    age: int | None = Field(default=30)
    sex: int | None = Field(default=0)
    glucose: float | None = Field(default=100.0)
    bmi: float | None = Field(default=24.0)
    bp: float | None = Field(default=120.0)
    insulin: float | None = Field(default=80.0)
    pregnancies: int | None = Field(default=0)
    skin_thickness: float | None = Field(default=20.0)
    dpf: float | None = Field(default=0.5)
    chol: float | None = Field(default=180.0)
    fbs: int | None = Field(default=0)
    thalach: float | None = Field(default=150.0)
    cp: int | None = Field(default=0)
    activity: str | None = Field(default="moderate")
    stress: str | None = Field(default="medium")
    aqi: float | None = Field(default=80.0)


class ProbabilityRisk(BaseModel):
    level: RiskLevel
    probability: float = Field(ge=0.0, le=1.0)
    reasons: list[str] = Field(default_factory=list)


class HypertensionRisk(BaseModel):
    level: RiskLevel
    score: int = Field(ge=0)
    reasons: list[str] = Field(default_factory=list)


class ObesityRisk(BaseModel):
    level: RiskLevel
    bmi: float


class AqiRisk(BaseModel):
    level: RiskLevel
    aqi: float
    advice: str


class HealthRiskConditions(BaseModel):
    diabetes: ProbabilityRisk
    heart: ProbabilityRisk
    hypertension: HypertensionRisk
    obesity: ObesityRisk
    aqi_risk: AqiRisk


class HealthRiskResponse(BaseModel):
    overall_risk: RiskLevel
    conditions: HealthRiskConditions
    disclaimer: str = "This is not a medical diagnosis"
