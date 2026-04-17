from datetime import UTC, datetime, timedelta
from typing import Literal
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.doctor_link import DoctorPatientLink, PatientShareToken
from app.models.risk_assessment import RiskAssessment
from app.models.user import User
from app.services import auth_service, risk_service

ExportScope = Literal["complete", "weekly", "this_month"]

CONNECT_TOKEN_PREFIX = "CURASYNC_CONNECT::"
CONNECT_TOKEN_TTL_MINUTES = 30


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _normalize_token_code(token_code: str) -> str:
    resolved = token_code.strip()
    if not resolved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token code is required.")

    if "::" in resolved:
        resolved = resolved.split("::")[-1]

    resolved = resolved.replace(" ", "").replace("\n", "").replace("\t", "").upper()
    if not resolved:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token code.")
    return resolved


def _generate_unique_token_code(db: Session) -> str:
    for _ in range(10):
        token_code = f"CS{uuid4().hex[:10]}".upper()
        exists = db.scalar(select(PatientShareToken.id).where(PatientShareToken.token_code == token_code))
        if not exists:
            return token_code
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Unable to create a unique connect token.")


def create_patient_share_token(db: Session, patient_user: User) -> PatientShareToken:
    now = _utc_now()
    active_tokens = list(
        db.scalars(
            select(PatientShareToken).where(
                PatientShareToken.patient_user_id == patient_user.id,
                PatientShareToken.claimed_at.is_(None),
                PatientShareToken.revoked_at.is_(None),
                PatientShareToken.expires_at > now,
            )
        ).all()
    )

    for token in active_tokens:
        token.revoked_at = now

    token_code = _generate_unique_token_code(db)
    share_token = PatientShareToken(
        patient_user_id=patient_user.id,
        token_code=token_code,
        qr_payload=f"{CONNECT_TOKEN_PREFIX}{token_code}",
        expires_at=now + timedelta(minutes=CONNECT_TOKEN_TTL_MINUTES),
    )
    db.add(share_token)
    db.commit()
    db.refresh(share_token)
    return share_token


def connect_doctor_to_patient(db: Session, doctor_user: User, token_code: str) -> tuple[DoctorPatientLink, User]:
    normalized_code = _normalize_token_code(token_code)
    share_token = db.scalar(select(PatientShareToken).where(PatientShareToken.token_code == normalized_code))
    if not share_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connect token not found.")

    now = _utc_now()
    if share_token.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Connect token is revoked. Ask patient for a new token.")
    if share_token.claimed_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Connect token already used.")
    if share_token.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Connect token expired. Ask patient for a fresh token.")

    patient = db.scalar(select(User).where(User.id == share_token.patient_user_id, User.is_active.is_(True)))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient account no longer exists.")
    if patient.id == doctor_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot connect to your own account.")

    link = db.scalar(
        select(DoctorPatientLink).where(
            DoctorPatientLink.doctor_user_id == doctor_user.id,
            DoctorPatientLink.patient_user_id == patient.id,
        )
    )
    if not link:
        link = DoctorPatientLink(doctor_user_id=doctor_user.id, patient_user_id=patient.id, created_at=now)

    link.last_accessed_at = now
    share_token.claimed_by_user_id = doctor_user.id
    share_token.claimed_at = now
    db.add(link)
    db.add(share_token)
    db.commit()
    db.refresh(link)
    return link, patient


def connect_doctor_to_patient_by_id(db: Session, doctor_user: User, patient_user_id: int) -> tuple[DoctorPatientLink, User]:
    patient = db.scalar(select(User).where(User.id == patient_user_id, User.is_active.is_(True)))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    if patient.id == doctor_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot connect to your own account.")

    now = _utc_now()
    link = db.scalar(
        select(DoctorPatientLink).where(
            DoctorPatientLink.doctor_user_id == doctor_user.id,
            DoctorPatientLink.patient_user_id == patient.id,
        )
    )
    if not link:
        link = DoctorPatientLink(doctor_user_id=doctor_user.id, patient_user_id=patient.id, created_at=now)
    link.last_accessed_at = now

    db.add(link)
    db.commit()
    db.refresh(link)
    return link, patient


def list_doctor_patients(db: Session, doctor_user_id: int) -> list[tuple[DoctorPatientLink, User]]:
    links = list(
        db.scalars(
            select(DoctorPatientLink)
            .where(DoctorPatientLink.doctor_user_id == doctor_user_id)
            .order_by(DoctorPatientLink.created_at.desc())
        ).all()
    )
    if not links:
        return []

    patient_ids = list({link.patient_user_id for link in links})
    patients = list(db.scalars(select(User).where(User.id.in_(patient_ids), User.is_active.is_(True))).all())
    patient_by_id = {patient.id: patient for patient in patients}

    return [(link, patient_by_id[link.patient_user_id]) for link in links if link.patient_user_id in patient_by_id]


def _assert_doctor_access(db: Session, doctor_user_id: int, patient_user_id: int) -> DoctorPatientLink:
    link = db.scalar(
        select(DoctorPatientLink).where(
            DoctorPatientLink.doctor_user_id == doctor_user_id,
            DoctorPatientLink.patient_user_id == patient_user_id,
        )
    )
    if not link:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient is not connected to your doctor account.")
    return link


def get_connected_patient_report(
    core_db: Session,
    tracking_db: Session,
    doctor_user_id: int,
    patient_user_id: int,
) -> tuple[DoctorPatientLink, User, dict, list[RiskAssessment]]:
    link = _assert_doctor_access(core_db, doctor_user_id, patient_user_id)
    patient = core_db.scalar(select(User).where(User.id == patient_user_id, User.is_active.is_(True)))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    overview = risk_service.latest_overview(tracking_db, patient_user_id)
    risk_rows = list(
        tracking_db.scalars(
            select(RiskAssessment)
            .where(RiskAssessment.user_id == patient_user_id)
            .order_by(RiskAssessment.generated_at.desc())
            .limit(8)
        ).all()
    )

    link.last_accessed_at = _utc_now()
    core_db.add(link)
    core_db.commit()
    core_db.refresh(link)
    return link, patient, overview, risk_rows


def export_connected_patient_pdf(
    core_db: Session,
    tracking_db: Session,
    doctor_user_id: int,
    patient_user_id: int,
    scope: ExportScope = "complete",
) -> tuple[bytes, User]:
    link = _assert_doctor_access(core_db, doctor_user_id, patient_user_id)
    patient = core_db.scalar(select(User).where(User.id == patient_user_id, User.is_active.is_(True)))
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    link.last_accessed_at = _utc_now()
    core_db.add(link)
    core_db.commit()

    pdf_bytes = auth_service.export_user_data_pdf(core_db, tracking_db, patient, scope=scope)
    return pdf_bytes, patient
