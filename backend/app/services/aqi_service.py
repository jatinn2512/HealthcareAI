from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.aqi_snapshot import AqiSnapshot
from app.schemas.aqi import AqiSnapshotCreate


def create_snapshot(db: Session, user_id: int, payload: AqiSnapshotCreate) -> AqiSnapshot:
    snapshot = AqiSnapshot(user_id=user_id, **payload.model_dump())
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def list_snapshots(db: Session, user_id: int, limit: int = 50) -> list[AqiSnapshot]:
    return list(
        db.scalars(
            select(AqiSnapshot)
            .where(AqiSnapshot.user_id == user_id)
            .order_by(AqiSnapshot.captured_at.desc())
            .limit(limit)
        )
    )
