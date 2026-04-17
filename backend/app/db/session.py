from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class CoreBase(DeclarativeBase):
    pass


class TrackingBase(DeclarativeBase):
    pass


CORE_DB_URL = settings.resolved_core_db_url
TRACKING_DB_URL = settings.resolved_tracking_db_url


def _create_engine(db_url: str) -> Engine:
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    engine = create_engine(db_url, connect_args=connect_args, future=True)

    if db_url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def _set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

    return engine


def _ensure_sqlite_paths() -> None:
    for db_url in (CORE_DB_URL, TRACKING_DB_URL):
        if not db_url.startswith("sqlite:///"):
            continue
        raw_path = db_url.replace("sqlite:///", "", 1)
        path = Path(raw_path)
        if not path.is_absolute():
            path = Path.cwd() / path
        path.parent.mkdir(parents=True, exist_ok=True)


_ensure_sqlite_paths()
core_engine = _create_engine(CORE_DB_URL)
tracking_engine = _create_engine(TRACKING_DB_URL)

CoreSessionLocal = sessionmaker(bind=core_engine, autoflush=False, autocommit=False, expire_on_commit=False)
TrackingSessionLocal = sessionmaker(bind=tracking_engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_core_db() -> Generator[Session, None, None]:
    db = CoreSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_tracking_db() -> Generator[Session, None, None]:
    db = TrackingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def _apply_core_users_schema_patches() -> None:
    """Lightweight additive migrations for existing deployments (SQLite + MySQL)."""
    inspector = inspect(core_engine)
    table_names = inspector.get_table_names()
    if "users" not in table_names:
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    statements: list[str] = []

    if "role" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'USER'")

    if CORE_DB_URL.startswith("sqlite"):
        if "token_version" not in existing_columns:
            statements.append("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0")
        if "is_active" not in existing_columns:
            statements.append("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1")
        if "last_login_at" not in existing_columns:
            statements.append("ALTER TABLE users ADD COLUMN last_login_at DATETIME")

    if statements:
        with core_engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))


def _apply_sqlite_profile_schema_patches() -> None:
    if not CORE_DB_URL.startswith("sqlite"):
        return

    inspector = inspect(core_engine)
    table_names = inspector.get_table_names()
    if "user_profiles" not in table_names:
        return

    profile_columns = {column["name"] for column in inspector.get_columns("user_profiles")}
    profile_statements: list[str] = []

    if "eyesight_left" not in profile_columns:
        profile_statements.append("ALTER TABLE user_profiles ADD COLUMN eyesight_left VARCHAR(30)")
    if "eyesight_right" not in profile_columns:
        profile_statements.append("ALTER TABLE user_profiles ADD COLUMN eyesight_right VARCHAR(30)")
    if "disability_status" not in profile_columns:
        profile_statements.append("ALTER TABLE user_profiles ADD COLUMN disability_status VARCHAR(30)")
    if "chronic_conditions" not in profile_columns:
        profile_statements.append("ALTER TABLE user_profiles ADD COLUMN chronic_conditions TEXT")
    if "allergies" not in profile_columns:
        profile_statements.append("ALTER TABLE user_profiles ADD COLUMN allergies TEXT")
    if "smoking_status" not in profile_columns:
        profile_statements.append("ALTER TABLE user_profiles ADD COLUMN smoking_status VARCHAR(30)")
    if "alcohol_intake" not in profile_columns:
        profile_statements.append("ALTER TABLE user_profiles ADD COLUMN alcohol_intake VARCHAR(30)")

    if not profile_statements:
        return

    with core_engine.begin() as connection:
        for statement in profile_statements:
            connection.execute(text(statement))


def init_db() -> None:
    from app.models import (  # noqa: F401
        aqi_snapshot,
        dish_nutrition,
        doctor_link,
        risk_assessment,
        user,
        user_profile,
        weekly_plan,
    )

    CoreBase.metadata.create_all(bind=core_engine)
    _apply_core_users_schema_patches()
    _apply_sqlite_profile_schema_patches()
    TrackingBase.metadata.create_all(bind=tracking_engine)
