from functools import lru_cache
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CuraSync API"
    app_version: str = "0.1.0"
    environment: str = "development"

    secret_key: str = "change-this-in-production"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14

    database_backend: str = "sqlite"
    core_db_url: str | None = None
    tracking_db_url: str | None = None

    mysql_host: str = "127.0.0.1"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_core_database: str = "curasync_core"
    mysql_tracking_database: str = "curasync_tracking"

    sqlite_core_db_url: str = "sqlite:///./data/curasync_core.db"
    sqlite_tracking_db_url: str = "sqlite:///./data/curasync_tracking.db"

    cors_origins_raw: str = "http://localhost:8080,http://localhost:5173,http://127.0.0.1:8080,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]

    def _build_mysql_url(self, database_name: str) -> str:
        encoded_user = quote_plus(self.mysql_user)
        encoded_password = quote_plus(self.mysql_password)
        auth_segment = f"{encoded_user}:{encoded_password}" if self.mysql_password else encoded_user
        return f"mysql+pymysql://{auth_segment}@{self.mysql_host}:{self.mysql_port}/{database_name}?charset=utf8mb4"

    @property
    def resolved_core_db_url(self) -> str:
        if self.core_db_url:
            return self.core_db_url
        if self.database_backend.strip().lower() == "sqlite":
            return self.sqlite_core_db_url
        return self._build_mysql_url(self.mysql_core_database)

    @property
    def resolved_tracking_db_url(self) -> str:
        if self.tracking_db_url:
            return self.tracking_db_url
        if self.database_backend.strip().lower() == "sqlite":
            return self.sqlite_tracking_db_url
        return self._build_mysql_url(self.mysql_tracking_database)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
