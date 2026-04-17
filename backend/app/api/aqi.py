from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_tracking_db
from app.models.user import User
from app.schemas.aqi import AqiSnapshotCreate, AqiSnapshotOut
from app.services import aqi_service, auth_service

router = APIRouter(prefix="/aqi", tags=["AQI"])


@router.post("/snapshots", response_model=AqiSnapshotOut, status_code=201)
def create_aqi_snapshot(
    payload: AqiSnapshotCreate,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return aqi_service.create_snapshot(db, current_user.id, payload)


@router.get("/snapshots", response_model=list[AqiSnapshotOut])
def get_aqi_snapshots(
    limit: int = Query(default=24, ge=1, le=200),
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_tracking_db),
):
    return aqi_service.list_snapshots(db, current_user.id, limit)
