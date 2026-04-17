from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_core_db, get_tracking_db
from app.models.user import User
from app.schemas.doctor import (
    DoctorConnectRequest,
    DoctorConnectResponse,
    DoctorConnectTokenResponse,
    DoctorPatientCardResponse,
    DoctorPatientLiteResponse,
    DoctorPatientReportResponse,
    DoctorRiskAssessmentItem,
)
from app.services import auth_service, doctor_service

router = APIRouter(prefix="/doctor", tags=["Doctor Connect"])


@router.post("/share-token", response_model=DoctorConnectTokenResponse)
def create_share_token(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_core_db),
):
    token = doctor_service.create_patient_share_token(db, current_user)
    patient = DoctorPatientLiteResponse(id=current_user.id, full_name=current_user.full_name, age=current_user.age, gender=current_user.gender)
    return DoctorConnectTokenResponse(
        token_code=token.token_code,
        qr_payload=token.qr_payload,
        expires_at=token.expires_at,
        created_at=token.created_at,
        patient=patient,
    )


@router.post("/connect", response_model=DoctorConnectResponse)
def connect_patient(
    payload: DoctorConnectRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_core_db),
):
    link, patient = doctor_service.connect_doctor_to_patient(db, current_user, payload.token_code)
    return DoctorConnectResponse(
        message="Patient connected successfully.",
        linked_at=link.created_at,
        patient=DoctorPatientLiteResponse(id=patient.id, full_name=patient.full_name, age=patient.age, gender=patient.gender),
    )


@router.get("/patients", response_model=list[DoctorPatientCardResponse])
def list_connected_patients(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_core_db),
):
    rows = doctor_service.list_doctor_patients(db, current_user.id)
    return [
        DoctorPatientCardResponse(
            patient=DoctorPatientLiteResponse(
                id=patient.id,
                full_name=patient.full_name,
                age=patient.age,
                gender=patient.gender,
            ),
            linked_at=link.created_at,
            last_accessed_at=link.last_accessed_at,
        )
        for link, patient in rows
    ]


@router.get("/patients/{patient_id}/report", response_model=DoctorPatientReportResponse)
def get_connected_patient_report(
    patient_id: int,
    current_user: User = Depends(auth_service.get_current_user),
    core_db: Session = Depends(get_core_db),
    tracking_db: Session = Depends(get_tracking_db),
):
    link, patient, overview, risk_rows = doctor_service.get_connected_patient_report(core_db, tracking_db, current_user.id, patient_id)
    return DoctorPatientReportResponse(
        patient=DoctorPatientLiteResponse(id=patient.id, full_name=patient.full_name, age=patient.age, gender=patient.gender),
        overview=overview,
        recent_risk_assessments=[
            DoctorRiskAssessmentItem(
                risk_type=row.risk_type,
                risk_level=row.risk_level,
                summary=row.summary,
                generated_at=row.generated_at,
            )
            for row in risk_rows
        ],
        linked_at=link.created_at,
        last_accessed_at=link.last_accessed_at,
    )


@router.get("/patients/{patient_id}/export/pdf")
def export_connected_patient_pdf(
    patient_id: int,
    scope: Literal["complete", "weekly", "this_month"] = Query(default="complete"),
    current_user: User = Depends(auth_service.get_current_user),
    core_db: Session = Depends(get_core_db),
    tracking_db: Session = Depends(get_tracking_db),
):
    pdf_data, patient = doctor_service.export_connected_patient_pdf(core_db, tracking_db, current_user.id, patient_id, scope=scope)
    filename = f"curasync-patient-{patient.id}-report-{scope}.pdf"
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
