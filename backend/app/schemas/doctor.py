from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DoctorPatientLiteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    age: int
    gender: str | None


class DoctorConnectTokenResponse(BaseModel):
    token_code: str
    qr_payload: str
    expires_at: datetime
    created_at: datetime
    patient: DoctorPatientLiteResponse


class DoctorConnectRequest(BaseModel):
    token_code: str = Field(min_length=4, max_length=180)


class DoctorConnectResponse(BaseModel):
    message: str
    linked_at: datetime
    patient: DoctorPatientLiteResponse


class DoctorPatientCardResponse(BaseModel):
    patient: DoctorPatientLiteResponse
    linked_at: datetime
    last_accessed_at: datetime | None


class DoctorRiskAssessmentItem(BaseModel):
    risk_type: str
    risk_level: str
    summary: str
    generated_at: datetime


class DoctorPatientReportResponse(BaseModel):
    patient: DoctorPatientLiteResponse
    overview: dict
    recent_risk_assessments: list[DoctorRiskAssessmentItem]
    linked_at: datetime
    last_accessed_at: datetime | None
