from datetime import UTC, date, datetime, timedelta
from typing import Literal
from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_core_db
from app.models.aqi_snapshot import AqiSnapshot
from app.models.dish_nutrition import HydrationLog, MealLog, NutritionGoal, RestaurantInteraction
from app.models.risk_assessment import ActivityLog, FeatureEvent, RiskAssessment, SleepLog, VitalsLog
from app.models.user import AuthSession, User
from app.models.user_profile import UserProfile, UserSettings
from app.models.weekly_plan import UserSubscription
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UpdateProfileRequest, UpdateSettingsRequest

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
ExportScope = Literal["complete", "weekly", "this_month"]

DEMO_USER_EMAIL = "user@gmail.com"
DEMO_USER_PASSWORD = "123456"
DEMO_USER_NAME = "Demo User"
DEMO_USER_PHONE = "9000000002"
DEMO_USER_AGE = 25

DEMO_HOSPITAL_EMAIL = "hospital@gmail.com"
DEMO_HOSPITAL_PASSWORD = "123456"
DEMO_HOSPITAL_NAME = "Hospital Administration"
DEMO_HOSPITAL_PHONE = "9000000001"
DEMO_HOSPITAL_AGE = 30


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower().strip()))


def _get_user_by_phone(db: Session, phone: str) -> User | None:
    return db.scalar(select(User).where(User.phone == phone.strip()))


def _generate_placeholder_phone(db: Session) -> str:
    while True:
        candidate = f"9{uuid4().int % 1_000_000_000:09d}"
        if not _get_user_by_phone(db, candidate):
            return candidate


def create_user(db: Session, payload: RegisterRequest) -> User:
    if _get_user_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    resolved_phone = payload.phone.strip() if payload.phone else _generate_placeholder_phone(db)
    if _get_user_by_phone(db, resolved_phone):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")
    resolved_age = payload.age if payload.age is not None else 21

    user = User(
        full_name=payload.full_name.strip(),
        phone=resolved_phone,
        email=payload.email.lower().strip(),
        age=resolved_age,
        gender=payload.gender,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    db.add(UserProfile(user_id=user.id, activity_level="moderate"))
    db.add(UserSettings(user_id=user.id))
    db.commit()
    db.refresh(user)
    return user


def _ensure_demo_account(
    db: Session,
    *,
    email: str,
    password: str,
    full_name: str,
    phone: str,
    age: int,
    gender: str | None = None,
) -> User:
    existing_user = _get_user_by_email(db, email)
    if existing_user:
        existing_user.full_name = full_name
        existing_user.is_active = True
        existing_user.hashed_password = hash_password(password)
        if not existing_user.phone:
            fallback_phone = phone
            if _get_user_by_phone(db, fallback_phone):
                fallback_phone = _generate_placeholder_phone(db)
            existing_user.phone = fallback_phone
        if existing_user.age < 18:
            existing_user.age = age
        if gender is not None:
            existing_user.gender = gender

        if existing_user.profile is None:
            db.add(UserProfile(user_id=existing_user.id, activity_level="moderate"))
        if existing_user.settings is None:
            db.add(UserSettings(user_id=existing_user.id))

        db.add(existing_user)
        db.commit()
        db.refresh(existing_user)
        return existing_user

    resolved_phone = phone
    if _get_user_by_phone(db, resolved_phone):
        resolved_phone = _generate_placeholder_phone(db)

    demo_user = User(
        full_name=full_name,
        phone=resolved_phone,
        email=email,
        age=age,
        gender=gender,
        hashed_password=hash_password(password),
    )
    db.add(demo_user)
    db.flush()

    db.add(UserProfile(user_id=demo_user.id, activity_level="moderate"))
    db.add(UserSettings(user_id=demo_user.id))
    db.commit()
    db.refresh(demo_user)
    return demo_user


def ensure_demo_user_account(db: Session) -> User:
    return _ensure_demo_account(
        db,
        email=DEMO_USER_EMAIL,
        password=DEMO_USER_PASSWORD,
        full_name=DEMO_USER_NAME,
        phone=DEMO_USER_PHONE,
        age=DEMO_USER_AGE,
        gender="N/A",
    )


def ensure_demo_hospital_account(db: Session) -> User:
    return _ensure_demo_account(
        db,
        email=DEMO_HOSPITAL_EMAIL,
        password=DEMO_HOSPITAL_PASSWORD,
        full_name=DEMO_HOSPITAL_NAME,
        phone=DEMO_HOSPITAL_PHONE,
        age=DEMO_HOSPITAL_AGE,
        gender="N/A",
    )


def _issue_token_pair(db: Session, user: User, user_agent: str | None = None, ip_address: str | None = None) -> TokenResponse:
    refresh_jti = uuid4().hex
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id), refresh_jti)

    session = AuthSession(
        user_id=user.id,
        refresh_jti=refresh_jti,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(session)
    user.last_login_at = datetime.now(UTC)
    db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


def login_user(db: Session, payload: LoginRequest, user_agent: str | None = None, ip_address: str | None = None) -> TokenResponse:
    normalized_email = payload.email.lower().strip()
    if normalized_email == DEMO_USER_EMAIL:
        ensure_demo_user_account(db)
    elif normalized_email == DEMO_HOSPITAL_EMAIL:
        ensure_demo_hospital_account(db)

    user = _get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    return _issue_token_pair(db, user, user_agent, ip_address)


def refresh_login(db: Session, refresh_token: str, user_agent: str | None = None, ip_address: str | None = None) -> TokenResponse:
    try:
        payload = decode_token(refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token") from exc
    token_type = payload.get("type")
    user_id = payload.get("sub")
    jti = payload.get("jti")

    if token_type != "refresh" or not user_id or not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    session = db.scalar(
        select(AuthSession).where(
            AuthSession.refresh_jti == jti,
            AuthSession.user_id == int(user_id),
            AuthSession.revoked_at.is_(None),
        )
    )
    if not session or session.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session expired")

    session.revoked_at = datetime.now(UTC)
    user = db.scalar(select(User).where(User.id == int(user_id), User.is_active.is_(True)))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return _issue_token_pair(db, user, user_agent, ip_address)


def logout_with_refresh_token(db: Session, refresh_token: str) -> None:
    try:
        payload = decode_token(refresh_token)
    except ValueError:
        return
    jti = payload.get("jti")
    if not jti:
        return

    session = db.scalar(select(AuthSession).where(AuthSession.refresh_jti == jti, AuthSession.revoked_at.is_(None)))
    if session:
        session.revoked_at = datetime.now(UTC)
        db.commit()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_core_db)) -> User:
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc
    token_type = payload.get("type")
    user_id = payload.get("sub")

    if token_type != "access" or not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")

    user = db.scalar(select(User).where(User.id == int(user_id), User.is_active.is_(True)))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user


def update_profile(db: Session, user: User, payload: UpdateProfileRequest) -> User:
    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.phone is not None and payload.phone != user.phone:
        existing_phone = _get_user_by_phone(db, payload.phone)
        if existing_phone and existing_phone.id != user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already exists")
        user.phone = payload.phone.strip()
    if payload.age is not None:
        user.age = payload.age
    if payload.gender is not None:
        user.gender = payload.gender

    profile = user.profile or UserProfile(user_id=user.id)
    if payload.height_cm is not None:
        profile.height_cm = payload.height_cm
    if payload.weight_kg is not None:
        profile.weight_kg = payload.weight_kg
    if payload.activity_level is not None:
        profile.activity_level = payload.activity_level
    if payload.eyesight_left is not None:
        profile.eyesight_left = payload.eyesight_left
    if payload.eyesight_right is not None:
        profile.eyesight_right = payload.eyesight_right
    if payload.disability_status is not None:
        profile.disability_status = payload.disability_status
    if payload.chronic_conditions is not None:
        profile.chronic_conditions = payload.chronic_conditions
    if payload.allergies is not None:
        profile.allergies = payload.allergies
    if payload.smoking_status is not None:
        profile.smoking_status = payload.smoking_status
    if payload.alcohol_intake is not None:
        profile.alcohol_intake = payload.alcohol_intake
    if payload.medical_notes is not None:
        profile.medical_notes = payload.medical_notes

    db.add(profile)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def get_user_settings(db: Session, user: User) -> UserSettings:
    settings = user.settings
    if settings is None:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def update_user_settings(db: Session, user: User, payload: UpdateSettingsRequest) -> UserSettings:
    settings = user.settings or UserSettings(user_id=user.id)

    if payload.theme is not None:
        settings.theme = payload.theme
    if payload.units is not None:
        settings.units = payload.units
    if payload.notifications_enabled is not None:
        settings.notifications_enabled = payload.notifications_enabled
    if payload.email_alerts_enabled is not None:
        settings.email_alerts_enabled = payload.email_alerts_enabled
    if payload.community_visibility is not None:
        settings.community_visibility = payload.community_visibility
    if payload.location_access_for_aqi is not None:
        settings.location_access_for_aqi = payload.location_access_for_aqi

    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


def _format_value(value: object) -> str:
    if value is None:
        return "N/A"
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, bool):
        return "Yes" if value else "No"
    return str(value)


def _wrap_text(text: str, max_chars: int = 95) -> list[str]:
    raw = text.strip()
    if not raw:
        return [""]

    words = raw.split()
    lines: list[str] = []
    current = ""
    for word in words:
        if not current:
            current = word
            continue
        candidate = f"{current} {word}"
        if len(candidate) <= max_chars:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def _escape_pdf_text(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _resolve_export_scope_window(scope: ExportScope) -> tuple[str, datetime | None, date | None]:
    now = datetime.now(UTC)
    if scope == "weekly":
        start_dt = now - timedelta(days=7)
        return "Weekly Health Data (Last 7 Days)", start_dt, start_dt.date()
    if scope == "this_month":
        start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return "This Month Health Data", start_dt, start_dt.date()
    return "Complete Health Data", None, None


def _build_pdf(lines: list[str]) -> bytes:
    if not lines:
        lines = ["@@BODY@@No user data available."]

    page_width = 595
    page_height = 842
    margin_left = 50.0
    margin_right = 50.0
    top_y = 770.0
    bottom_y = 55.0

    def parse_styled_line(raw_line: str) -> tuple[str, str]:
        if raw_line.startswith("@@TITLE@@"):
            return "TITLE", raw_line.removeprefix("@@TITLE@@").strip()
        if raw_line.startswith("@@CENTER@@"):
            return "CENTER", raw_line.removeprefix("@@CENTER@@").strip()
        if raw_line.startswith("@@H2@@"):
            return "H2", raw_line.removeprefix("@@H2@@").strip()
        if raw_line.startswith("@@H3@@"):
            return "H3", raw_line.removeprefix("@@H3@@").strip()
        if raw_line.startswith("@@BLANK@@"):
            return "BLANK", ""
        if raw_line.startswith("@@BODY@@"):
            return "BODY", raw_line.removeprefix("@@BODY@@").strip()
        return "BODY", raw_line.strip()

    def style_config(style: str) -> tuple[str, float, float, str, int]:
        if style == "TITLE":
            return ("F2", 18.0, 24.0, "center", 60)
        if style == "CENTER":
            return ("F1", 10.0, 14.0, "center", 85)
        if style == "H2":
            return ("F2", 12.0, 18.0, "left", 82)
        if style == "H3":
            return ("F2", 10.0, 14.0, "left", 86)
        return ("F1", 10.0, 13.0, "left", 90)

    def estimate_text_width(text: str, font_size: float) -> float:
        return max(0.0, len(text) * font_size * 0.5)

    def compute_x(text: str, font_size: float, align: str) -> float:
        if align != "center":
            return margin_left
        width = estimate_text_width(text, font_size)
        centered = (page_width - width) / 2
        return max(margin_left, min(centered, page_width - margin_right - width))

    pages_commands: list[list[str]] = []
    current_page: list[str] = []
    y = top_y

    def flush_page() -> None:
        nonlocal current_page, y
        if not current_page:
            current_page = [f"BT /F1 10 Tf 1 0 0 1 {margin_left:.2f} {top_y:.2f} Tm (No user data available.) Tj ET"]
        pages_commands.append(current_page)
        current_page = []
        y = top_y

    for raw_line in lines:
        style, text = parse_styled_line(raw_line)
        font_key, font_size, leading, align, max_chars = style_config(style)

        if style == "BLANK":
            y -= 10.0
            if y < bottom_y:
                flush_page()
            continue

        wrapped_lines = _wrap_text(text, max_chars=max_chars) if text else [""]
        for segment in wrapped_lines:
            if y < bottom_y:
                flush_page()
            x = compute_x(segment, font_size, align)
            escaped = _escape_pdf_text(segment)
            current_page.append(f"BT /{font_key} {font_size:.1f} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({escaped}) Tj ET")
            y -= leading

    if current_page or not pages_commands:
        flush_page()

    object_contents: dict[int, bytes] = {}
    page_count = len(pages_commands)
    bold_font_obj_num = 3 + (page_count * 2)
    regular_font_obj_num = bold_font_obj_num + 1

    object_contents[1] = b"<< /Type /Catalog /Pages 2 0 R >>"
    kids_refs = " ".join(f"{3 + (index * 2)} 0 R" for index in range(page_count))
    object_contents[2] = f"<< /Type /Pages /Count {page_count} /Kids [{kids_refs}] >>".encode()

    for page_index, commands in enumerate(pages_commands):
        page_obj_num = 3 + (page_index * 2)
        content_obj_num = 4 + (page_index * 2)
        header_commands = [
            "q 0.16 0.53 0.45 rg 266 808 16 16 re f Q",
            "q 1 1 1 rg 273 811 2 10 re f 270 814 8 2 re f Q",
            "q 0.7 w 0.82 0.86 0.9 RG 50 790 m 545 790 l S Q",
        ]
        footer_commands = [
            "BT /F1 9 Tf 1 0 0 1 50 32 Tm (Generated by CuraSync) Tj ET",
            f"BT /F1 9 Tf 1 0 0 1 485 32 Tm (Page {page_index + 1}/{page_count}) Tj ET",
        ]
        stream = "\n".join(header_commands + commands + footer_commands).encode("latin-1", "replace")

        object_contents[page_obj_num] = (
            f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_width} {page_height}] "
            f"/Resources << /Font << /F1 {regular_font_obj_num} 0 R /F2 {bold_font_obj_num} 0 R >> >> "
            f"/Contents {content_obj_num} 0 R >>"
        ).encode()
        object_contents[content_obj_num] = f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream"

    object_contents[bold_font_obj_num] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
    object_contents[regular_font_obj_num] = b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    max_obj_num = regular_font_obj_num

    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")

    offsets: dict[int, int] = {}
    for obj_num in range(1, max_obj_num + 1):
        offsets[obj_num] = len(pdf)
        pdf.extend(f"{obj_num} 0 obj\n".encode())
        pdf.extend(object_contents[obj_num])
        pdf.extend(b"\nendobj\n")

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {max_obj_num + 1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for obj_num in range(1, max_obj_num + 1):
        pdf.extend(f"{offsets[obj_num]:010d} 00000 n \n".encode())

    pdf.extend(f"trailer\n<< /Size {max_obj_num + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF".encode())
    return bytes(pdf)


def export_user_data_pdf(core_db: Session, tracking_db: Session, user: User, scope: ExportScope = "complete") -> bytes:
    scope_label, start_datetime, start_date = _resolve_export_scope_window(scope)
    settings_obj = get_user_settings(core_db, user)
    profile = user.profile

    subscription = core_db.scalar(
        select(UserSubscription)
        .where(UserSubscription.user_id == user.id)
        .order_by(UserSubscription.started_at.desc())
    )
    if subscription:
        core_db.refresh(subscription, attribute_names=["plan"])

    meals_query = select(MealLog).where(MealLog.user_id == user.id)
    hydration_query = select(HydrationLog).where(HydrationLog.user_id == user.id)
    aqi_query = select(AqiSnapshot).where(AqiSnapshot.user_id == user.id)
    sleep_query = select(SleepLog).where(SleepLog.user_id == user.id)
    activity_query = select(ActivityLog).where(ActivityLog.user_id == user.id)
    vitals_query = select(VitalsLog).where(VitalsLog.user_id == user.id)
    risk_query = select(RiskAssessment).where(RiskAssessment.user_id == user.id)
    events_query = select(FeatureEvent).where(FeatureEvent.user_id == user.id)
    restaurant_query = select(RestaurantInteraction).where(RestaurantInteraction.user_id == user.id)

    if start_datetime is not None:
        meals_query = meals_query.where(MealLog.logged_at >= start_datetime)
        hydration_query = hydration_query.where(HydrationLog.logged_at >= start_datetime)
        aqi_query = aqi_query.where(AqiSnapshot.captured_at >= start_datetime)
        activity_query = activity_query.where(ActivityLog.logged_at >= start_datetime)
        vitals_query = vitals_query.where(VitalsLog.logged_at >= start_datetime)
        risk_query = risk_query.where(RiskAssessment.generated_at >= start_datetime)
        events_query = events_query.where(FeatureEvent.created_at >= start_datetime)
        restaurant_query = restaurant_query.where(RestaurantInteraction.created_at >= start_datetime)
    if start_date is not None:
        sleep_query = sleep_query.where(SleepLog.sleep_date >= start_date)

    meals = list(tracking_db.scalars(meals_query.order_by(MealLog.logged_at.desc())).all())
    hydration_logs = list(tracking_db.scalars(hydration_query.order_by(HydrationLog.logged_at.desc())).all())
    goal = tracking_db.scalar(select(NutritionGoal).where(NutritionGoal.user_id == user.id))
    aqi_snapshots = list(tracking_db.scalars(aqi_query.order_by(AqiSnapshot.captured_at.desc())).all())
    sleep_logs = list(tracking_db.scalars(sleep_query.order_by(SleepLog.sleep_date.desc())).all())
    activity_logs = list(tracking_db.scalars(activity_query.order_by(ActivityLog.logged_at.desc())).all())
    vitals_logs = list(tracking_db.scalars(vitals_query.order_by(VitalsLog.logged_at.desc())).all())
    risk_assessments = list(tracking_db.scalars(risk_query.order_by(RiskAssessment.generated_at.desc())).all())
    feature_events = list(tracking_db.scalars(events_query.order_by(FeatureEvent.created_at.desc())).all())
    restaurant_logs = list(tracking_db.scalars(restaurant_query.order_by(RestaurantInteraction.created_at.desc())).all())

    latest_vitals = vitals_logs[0] if vitals_logs else None
    latest_sleep = sleep_logs[0] if sleep_logs else None
    latest_activity = activity_logs[0] if activity_logs else None

    avg_sleep_minutes = round(sum(log.duration_minutes for log in sleep_logs) / len(sleep_logs), 1) if sleep_logs else None
    total_water_ml = sum(log.amount_ml for log in hydration_logs) if hydration_logs else 0
    avg_meal_calories = round(sum(meal.calories for meal in meals) / len(meals), 1) if meals else None

    latest_risk_by_type: dict[str, RiskAssessment] = {}
    for risk in risk_assessments:
        if risk.risk_type not in latest_risk_by_type:
            latest_risk_by_type[risk.risk_type] = risk

    lines: list[str] = []
    lines.append("@@TITLE@@CuraSync")
    lines.append("@@CENTER@@Health Report")
    lines.append(f"@@CENTER@@Generated at: {_format_value(datetime.now(UTC))}")
    lines.append(f"@@CENTER@@Report Scope: {scope_label}")
    lines.append("@@BLANK@@")

    lines.append("@@H2@@Patient Details")
    lines.append(f"@@BODY@@Patient ID: {user.id}")
    lines.append(f"@@BODY@@Name: {user.full_name}")
    lines.append(f"@@BODY@@Gender: {_format_value(user.gender)}")
    lines.append(f"@@BODY@@Age: {_format_value(user.age)}")
    lines.append(f"@@BODY@@DOB: {_format_value(profile.date_of_birth if profile else None)}")
    lines.append(f"@@BODY@@Email: {user.email}")
    lines.append(f"@@BODY@@Phone: {user.phone}")
    lines.append(f"@@BODY@@Last Login: {_format_value(user.last_login_at)}")
    lines.append("@@BLANK@@")

    lines.append("@@H2@@Profile Snapshot")
    lines.append(f"@@BODY@@Height (cm): {_format_value(profile.height_cm if profile else None)}")
    lines.append(f"@@BODY@@Weight (kg): {_format_value(profile.weight_kg if profile else None)}")
    lines.append(f"@@BODY@@Target Weight (kg): {_format_value(profile.target_weight_kg if profile else None)}")
    lines.append(f"@@BODY@@Activity Level: {_format_value(profile.activity_level if profile else None)}")
    lines.append(f"@@BODY@@Medical Notes: {_format_value(profile.medical_notes if profile else None)}")
    lines.append("@@BLANK@@")

    lines.append("@@H2@@Clinical Summary")
    lines.append(f"@@BODY@@Meals logged: {len(meals)}")
    lines.append(f"@@BODY@@Hydration entries: {len(hydration_logs)} | Total water: {total_water_ml} ml")
    lines.append(f"@@BODY@@Sleep logs: {len(sleep_logs)} | Avg sleep: {_format_value(avg_sleep_minutes)} min")
    lines.append(f"@@BODY@@Activity logs: {len(activity_logs)} | Vitals logs: {len(vitals_logs)}")
    lines.append(f"@@BODY@@Risk assessments: {len(risk_assessments)}")
    lines.append(f"@@BODY@@AQI snapshots: {len(aqi_snapshots)}")
    if avg_meal_calories is not None:
        lines.append(f"@@BODY@@Avg meal calories: {avg_meal_calories} kcal")
    if latest_vitals:
        lines.append(
            f"@@BODY@@Latest vitals: HR {_format_value(latest_vitals.heart_rate)} | "
            f"BP {_format_value(latest_vitals.systolic_bp)}/{_format_value(latest_vitals.diastolic_bp)} | "
            f"SpO2 {_format_value(latest_vitals.spo2)}"
        )
    if latest_sleep:
        lines.append(
            f"@@BODY@@Latest sleep: {_format_value(latest_sleep.sleep_date)} | "
            f"Duration {latest_sleep.duration_minutes} mins | Quality {_format_value(latest_sleep.quality_score)}"
        )
    if latest_activity:
        lines.append(
            f"@@BODY@@Latest activity: {_format_value(latest_activity.logged_at)} | "
            f"Steps {latest_activity.steps} | Workout {latest_activity.workout_minutes} mins"
        )
    lines.append("@@BLANK@@")

    lines.append("@@H2@@Latest Risk Signals")
    if latest_risk_by_type:
        for risk_type, risk in sorted(latest_risk_by_type.items(), key=lambda item: item[0].lower()):
            lines.append(
                f"@@BODY@@{risk_type}: {risk.risk_level} "
                f"({_format_value(risk.generated_at)}) - {risk.summary}"
            )
    else:
        lines.append("@@BODY@@No risk assessment records found for this scope.")
    lines.append("@@BLANK@@")

    lines.append("@@H2@@Account And Settings")
    lines.append(f"@@BODY@@Account created: {_format_value(user.created_at)}")
    lines.append(f"@@BODY@@Theme: {settings_obj.theme} | Units: {settings_obj.units}")
    lines.append(
        f"@@BODY@@Notifications: {_format_value(settings_obj.notifications_enabled)} | "
        f"Email alerts: {_format_value(settings_obj.email_alerts_enabled)}"
    )
    lines.append(
        f"@@BODY@@Community visibility: {settings_obj.community_visibility} | "
        f"AQI location access: {_format_value(settings_obj.location_access_for_aqi)}"
    )
    lines.append("@@BLANK@@")

    lines.append("@@H2@@Subscription")
    if subscription and subscription.plan:
        lines.append(f"@@BODY@@Plan: {subscription.plan.name} ({subscription.plan.code})")
        lines.append(f"@@BODY@@Billing Cycle: {_format_value(subscription.billing_cycle)}")
        lines.append(f"@@BODY@@Status: {_format_value(subscription.status)}")
        lines.append(f"@@BODY@@Started At: {_format_value(subscription.started_at)}")
        lines.append(f"@@BODY@@Ends At: {_format_value(subscription.ends_at)}")
    else:
        lines.append("@@BODY@@No subscription records.")
    lines.append("@@BLANK@@")

    lines.append(f"@@H2@@Nutrition Goal ({'Available' if goal else 'Not set'})")
    if goal:
        lines.append(f"@@BODY@@Calories: {goal.calorie_target}")
        lines.append(f"@@BODY@@Protein (g): {goal.protein_target_g}")
        lines.append(f"@@BODY@@Carbs (g): {goal.carbs_target_g}")
        lines.append(f"@@BODY@@Fat (g): {goal.fat_target_g}")
        lines.append(f"@@BODY@@Water (ml): {goal.water_target_ml}")
    lines.append("@@BLANK@@")

    def append_records(title: str, records: list[str], max_items: int = 200) -> None:
        lines.append(f"@@H2@@{title} ({len(records)})")
        if not records:
            lines.append("@@BODY@@No records.")
            lines.append("@@BLANK@@")
            return
        for record in records[:max_items]:
            lines.append(f"@@BODY@@{record}")
        if len(records) > max_items:
            lines.append(f"@@BODY@@... and {len(records) - max_items} more records")
        lines.append("@@BLANK@@")

    append_records(
        "MEAL LOGS",
        [
            f"{index}. {_format_value(meal.logged_at)} | {meal.meal_type} | {meal.food_name} | "
            f"{meal.calories} kcal | P/C/F: {meal.protein_g}/{meal.carbs_g}/{meal.fat_g}"
            for index, meal in enumerate(meals, start=1)
        ],
    )
    append_records(
        "HYDRATION LOGS",
        [f"{index}. {_format_value(log.logged_at)} | {log.amount_ml} ml" for index, log in enumerate(hydration_logs, start=1)],
    )
    append_records(
        "AQI SNAPSHOTS",
        [
            f"{index}. {_format_value(snapshot.captured_at)} | {snapshot.city} | AQI {snapshot.aqi_value} ({snapshot.category})"
            for index, snapshot in enumerate(aqi_snapshots, start=1)
        ],
    )
    append_records(
        "SLEEP LOGS",
        [
            f"{index}. {_format_value(log.sleep_date)} | Duration: {log.duration_minutes} mins | Quality: {_format_value(log.quality_score)}"
            for index, log in enumerate(sleep_logs, start=1)
        ],
    )
    append_records(
        "ACTIVITY LOGS",
        [
            f"{index}. {_format_value(log.logged_at)} | Steps: {log.steps} | Workout: {log.workout_minutes} mins | "
            f"Calories: {log.calories_burned}"
            for index, log in enumerate(activity_logs, start=1)
        ],
    )
    append_records(
        "VITALS LOGS",
        [
            f"{index}. {_format_value(log.logged_at)} | HR: {_format_value(log.heart_rate)} | BP: "
            f"{_format_value(log.systolic_bp)}/{_format_value(log.diastolic_bp)} | SpO2: {_format_value(log.spo2)}"
            for index, log in enumerate(vitals_logs, start=1)
        ],
    )
    append_records(
        "RISK ASSESSMENTS",
        [
            f"{index}. {_format_value(log.generated_at)} | {log.risk_type} | {log.risk_level} | {log.summary}"
            for index, log in enumerate(risk_assessments, start=1)
        ],
    )
    append_records(
        "FEATURE EVENTS",
        [
            f"{index}. {_format_value(log.created_at)} | {log.feature}:{log.action} | metadata: {_format_value(log.metadata_json)}"
            for index, log in enumerate(feature_events, start=1)
        ],
    )
    append_records(
        "RESTAURANT INTERACTIONS",
        [
            f"{index}. {_format_value(log.created_at)} | {log.restaurant_name} | {log.action} | "
            f"dish: {_format_value(log.dish_name)}"
            for index, log in enumerate(restaurant_logs, start=1)
        ],
    )

    lines.append("@@H2@@Doctor Notes")
    lines.append("@@BODY@@Clinical correlation advised with laboratory investigations and physician review.")
    lines.append("@@BODY@@Observed digital trends should be used as supportive information, not as sole diagnosis criteria.")
    lines.append("@@BLANK@@")

    lines.append("@@H3@@Disclaimer")
    lines.append(
        "@@BODY@@This report is generated by CuraSync for wellness tracking support and is not a medical diagnosis."
    )
    lines.append("@@BODY@@Consult a qualified healthcare professional for clinical interpretation and treatment decisions.")

    return _build_pdf(lines)
