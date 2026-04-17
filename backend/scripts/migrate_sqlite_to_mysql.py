from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from sqlalchemy import MetaData, create_engine, select, text
from sqlalchemy.engine import Engine

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.core.config import settings  # noqa: E402
from app.db.session import init_db  # noqa: E402


def _create_mysql_databases() -> None:
    server_url = (
        f"mysql+pymysql://{settings.mysql_user}:{settings.mysql_password}@"
        f"{settings.mysql_host}:{settings.mysql_port}/mysql?charset=utf8mb4"
    )
    engine = create_engine(server_url, future=True)
    with engine.begin() as connection:
        connection.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{settings.mysql_core_database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
        connection.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{settings.mysql_tracking_database}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )


def _clear_destination_tables(engine: Engine) -> None:
    metadata = MetaData()
    metadata.reflect(bind=engine)
    with engine.begin() as connection:
        connection.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table in reversed(metadata.sorted_tables):
            connection.execute(table.delete())
        connection.execute(text("SET FOREIGN_KEY_CHECKS=1"))


def _copy_database(source_url: str, destination_url: str, label: str) -> tuple[dict[str, int], dict[str, int]]:
    source_engine = create_engine(source_url, future=True)
    destination_engine = create_engine(destination_url, future=True)

    source_meta = MetaData()
    destination_meta = MetaData()
    source_meta.reflect(bind=source_engine)
    destination_meta.reflect(bind=destination_engine)

    source_counts: dict[str, int] = {}
    destination_counts: dict[str, int] = {}

    with source_engine.connect() as source_conn:
        with destination_engine.begin() as destination_conn:
            destination_conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
            for source_table in source_meta.sorted_tables:
                dest_table = destination_meta.tables.get(source_table.name)
                if dest_table is None:
                    continue

                rows = source_conn.execute(select(source_table)).mappings().all()
                source_counts[source_table.name] = len(rows)

                if rows:
                    dest_columns = set(dest_table.columns.keys())
                    payload = [{key: value for key, value in dict(row).items() if key in dest_columns} for row in rows]
                    destination_conn.execute(dest_table.insert(), payload)
                    destination_counts[source_table.name] = len(payload)
                else:
                    destination_counts[source_table.name] = 0
            destination_conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))

    print(f"\n{label.upper()} TABLE COUNTS")
    for table_name in sorted(source_counts):
        print(f"- {table_name}: sqlite={source_counts[table_name]}, mysql={destination_counts.get(table_name, 0)}")

    mismatches = [name for name, count in source_counts.items() if destination_counts.get(name, 0) != count]
    if mismatches:
        names = ", ".join(sorted(mismatches))
        raise RuntimeError(f"{label}: row-count mismatch found for table(s): {names}")

    return source_counts, destination_counts


def _resolved_sqlite_url(raw_url: str) -> str:
    if not raw_url.startswith("sqlite:///"):
        return raw_url
    local_path = raw_url.replace("sqlite:///", "", 1)
    path = Path(local_path)
    if path.is_absolute():
        return raw_url
    absolute_path = BACKEND_ROOT / path
    return f"sqlite:///{absolute_path.as_posix()}"


def main() -> None:
    if settings.database_backend.strip().lower() != "mysql":
        raise RuntimeError("DATABASE_BACKEND must be 'mysql' in backend/.env before running migration.")

    sqlite_core_url = _resolved_sqlite_url(settings.sqlite_core_db_url)
    sqlite_tracking_url = _resolved_sqlite_url(settings.sqlite_tracking_db_url)

    print("Preparing MySQL databases...")
    _create_mysql_databases()

    print("Initializing destination schema...")
    init_db()

    print("Clearing destination tables before copy...")
    _clear_destination_tables(create_engine(settings.resolved_core_db_url, future=True))
    _clear_destination_tables(create_engine(settings.resolved_tracking_db_url, future=True))

    print("Copying core data (users, profiles, auth/subscription records)...")
    _copy_database(sqlite_core_url, settings.resolved_core_db_url, "core")

    print("Copying tracking data (sleep, activity, vitals, meals, risks, AQI, interactions)...")
    _copy_database(sqlite_tracking_url, settings.resolved_tracking_db_url, "tracking")

    print("\nMigration completed successfully. SQLite data is now mirrored in MySQL.")


if __name__ == "__main__":
    main()
