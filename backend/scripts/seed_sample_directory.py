"""Seed realistic sample users, doctor accounts, patient links, and lightweight visit notes.

Run from repo root:
  python backend/scripts/seed_sample_directory.py

Or from backend with PYTHONPATH set:
  cd backend && set PYTHONPATH=. && python scripts/seed_sample_directory.py
"""

from __future__ import annotations

import sys
from datetime import UTC, datetime
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from sqlalchemy import select  # noqa: E402

from app.core import roles  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import CoreSessionLocal, init_db  # noqa: E402
from app.models.doctor_link import DoctorPatientLink  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.user_profile import UserProfile, UserSettings  # noqa: E402
from app.services.plan_service import ensure_default_plans, subscribe_user  # noqa: E402


def _get_or_create_user(
    db,
    *,
    email: str,
    password: str,
    full_name: str,
    phone: str,
    age: int,
    gender: str | None,
    role: str,
) -> User:
    normalized = email.lower().strip()
    existing = db.scalar(select(User).where(User.email == normalized))
    if existing:
        if existing.role != role:
            existing.role = role
            db.add(existing)
            db.commit()
            db.refresh(existing)
        return existing

    user = User(
        full_name=full_name,
        phone=phone,
        email=normalized,
        age=age,
        gender=gender,
        hashed_password=hash_password(password),
        role=role,
    )
    db.add(user)
    db.flush()
    db.add(UserProfile(user_id=user.id, activity_level="moderate"))
    db.add(UserSettings(user_id=user.id))
    db.commit()
    db.refresh(user)
    ensure_default_plans(db)
    subscribe_user(db, user, plan_code="current", billing_cycle="monthly")
    return user


def main() -> None:
    init_db()
    db = CoreSessionLocal()
    try:
        ensure_default_plans(db)

        admin = _get_or_create_user(
            db,
            email="seed.admin@curasync.local",
            password="SeedAdmin123!",
            full_name="Directory Admin",
            phone="9100000001",
            age=42,
            gender="N/A",
            role=roles.ADMIN,
        )

        dr_arya = _get_or_create_user(
            db,
            email="dr.arya@curasync.local",
            password="SeedDoctor123!",
            full_name="Dr. Arya Menon",
            phone="9100000002",
            age=38,
            gender="F",
            role=roles.DOCTOR,
        )

        dr_rahul = _get_or_create_user(
            db,
            email="dr.rahul@curasync.local",
            password="SeedDoctor123!",
            full_name="Dr. Rahul Verma",
            phone="9100000003",
            age=45,
            gender="M",
            role=roles.DOCTOR,
        )

        p_mira = _get_or_create_user(
            db,
            email="mira.patient@curasync.local",
            password="SeedPatient123!",
            full_name="Mira Kapoor",
            phone="9100000011",
            age=34,
            gender="F",
            role=roles.USER,
        )

        p_omar = _get_or_create_user(
            db,
            email="omar.patient@curasync.local",
            password="SeedPatient123!",
            full_name="Omar Siddiqui",
            phone="9100000012",
            age=29,
            gender="M",
            role=roles.USER,
        )

        p_leah = _get_or_create_user(
            db,
            email="leah.patient@curasync.local",
            password="SeedPatient123!",
            full_name="Leah Thomas",
            phone="9100000013",
            age=52,
            gender="F",
            role=roles.USER,
        )

        visit_note = (
            f"Seeded primary-care touchpoints as of {datetime.now(UTC).date().isoformat()} "
            "(demo chart review; not clinical advice)."
        )

        pairs = [
            (dr_arya.id, p_mira.id, "Follow-up: asthma action plan review."),
            (dr_arya.id, p_omar.id, "Nutrition counseling — Mediterranean pattern emphasis."),
            (dr_rahul.id, p_leah.id, "Cardio-metabolic screening intake."),
            (dr_rahul.id, p_mira.id, "Cross-cover consult — travel vaccines discussed."),
        ]

        for doctor_id, patient_id, note in pairs:
            link = db.scalar(
                select(DoctorPatientLink).where(
                    DoctorPatientLink.doctor_user_id == doctor_id,
                    DoctorPatientLink.patient_user_id == patient_id,
                )
            )
            if not link:
                link = DoctorPatientLink(
                    doctor_user_id=doctor_id,
                    patient_user_id=patient_id,
                    notes=f"{visit_note} {note}",
                )
                db.add(link)
            elif not (link.notes or "").strip():
                link.notes = f"{visit_note} {note}"
                db.add(link)

        db.commit()

        print("Seed complete.")
        print(f"  Admin id={admin.id} email={admin.email}")
        print(f"  Doctors: {dr_arya.email}, {dr_rahul.email} (password SeedDoctor123!)")
        print(f"  Patients: {p_mira.email}, {p_omar.email}, {p_leah.email} (password SeedPatient123!)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
