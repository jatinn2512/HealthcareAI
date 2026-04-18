from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_core_db, get_tracking_db
from app.models.user import User
from app.schemas.risk import (
    ActivityLogCreate,
    ActivityLogOut,
    FeatureEventCreate,
    InstantAlertCreate,
    InstantAlertHistoryResponse,
    InstantAlertResponse,
    LabReportIngestRequest,
    LabReportIngestResponse,
    RiskAssessmentCreate,
    SleepLogCreate,
    SleepLogOut,
    VitalsLogCreate,
    VitalsLogOut,
    WearableSyncCreate,
    WearableSyncResponse,
)
from app.services import auth_service, risk_service

router = APIRouter(prefix="/risk", tags=["Risk & Tracking"])


@router.post("/sleep", response_model=SleepLogOut, status_code=201)
def add_sleep_log(
    payload: SleepLogCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return risk_service.create_sleep_log(db, current_user.id, payload)


@router.post("/activity", response_model=ActivityLogOut, status_code=201)
def add_activity_log(
    payload: ActivityLogCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return risk_service.create_activity_log(db, current_user.id, payload)


@router.post("/vitals", response_model=VitalsLogOut, status_code=201)
def add_vitals_log(
    payload: VitalsLogCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return risk_service.create_vitals_log(db, current_user.id, payload)


@router.post("/events", status_code=201)
def add_feature_event(
    payload: FeatureEventCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    event = risk_service.create_feature_event(db, current_user.id, payload)
    return {"id": event.id, "message": "Event logged"}


@router.post("/assessments", status_code=201)
def add_risk_assessment(
    payload: RiskAssessmentCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    assessment = risk_service.create_risk_assessment(db, current_user.id, payload)
    return {"id": assessment.id, "message": "Assessment logged"}


@router.get("/overview")
def get_latest_overview(
    current_user: User = Depends(auth_service.get_current_user),
    core_db: Session = Depends(get_core_db),
    db: Session = Depends(get_tracking_db),
):
    user = core_db.scalar(select(User).where(User.id == current_user.id).options(selectinload(User.profile)))
    profile = user.profile if user else None
    height_cm = float(profile.height_cm) if profile and profile.height_cm is not None else None
    weight_kg = float(profile.weight_kg) if profile and profile.weight_kg is not None else None
    return risk_service.latest_overview(db, current_user.id, height_cm=height_cm, weight_kg=weight_kg)


@router.post("/lab-report/ingest", response_model=LabReportIngestResponse, status_code=201)
def ingest_lab_report(
    payload: LabReportIngestRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return risk_service.ingest_lab_report_text(
        db,
        current_user.id,
        text=payload.text,
        recorded_at=payload.recorded_at,
    )


@router.post("/instant-alert", response_model=InstantAlertResponse)
def create_instant_alert(
    payload: InstantAlertCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return risk_service.create_instant_alert(db, current_user.id, payload)


@router.get("/instant-alert/history", response_model=InstantAlertHistoryResponse)
def get_instant_alert_history(
    limit: int = 15,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return risk_service.get_instant_alert_history(db, current_user.id, limit=limit)


@router.post("/wearable-sync", response_model=WearableSyncResponse)
def sync_wearable_data(
    payload: WearableSyncCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return risk_service.sync_wearable_data(db, current_user.id, payload)
