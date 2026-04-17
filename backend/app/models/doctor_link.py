from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import CoreBase


class DoctorPatientLink(CoreBase):
    __tablename__ = "doctor_patient_links"
    __table_args__ = (
        UniqueConstraint("doctor_user_id", "patient_user_id", name="uq_doctor_patient_link_pair"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)
    last_accessed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    doctor: Mapped["User"] = relationship("User", foreign_keys=[doctor_user_id], back_populates="doctor_patient_links")
    patient: Mapped["User"] = relationship("User", foreign_keys=[patient_user_id], back_populates="patient_doctor_links")


class PatientShareToken(CoreBase):
    __tablename__ = "patient_share_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_code: Mapped[str] = mapped_column(String(40), nullable=False, unique=True, index=True)
    qr_payload: Mapped[str] = mapped_column(String(180), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    claimed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    patient: Mapped["User"] = relationship("User", foreign_keys=[patient_user_id], back_populates="generated_share_tokens")
    claimed_by: Mapped["User"] = relationship("User", foreign_keys=[claimed_by_user_id], back_populates="claimed_share_tokens")
