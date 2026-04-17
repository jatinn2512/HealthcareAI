from datetime import UTC, datetime, timedelta
import base64
import hashlib
import hmac
import secrets
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"
PBKDF2_SCHEME = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 10000  # Development speed (use 100000+ in production)
SALT_BYTES = 16


def _b64_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _b64_decode(raw: str) -> bytes:
    padding = "=" * ((4 - len(raw) % 4) % 4)
    return base64.urlsafe_b64decode((raw + padding).encode("ascii"))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"{PBKDF2_SCHEME}${PBKDF2_ITERATIONS}${_b64_encode(salt)}${_b64_encode(digest)}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password.startswith(f"{PBKDF2_SCHEME}$"):
        if hashed_password.startswith("$2"):
            try:
                import bcrypt  # type: ignore

                return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
            except Exception:
                return False
        return False

    try:
        _, iterations_raw, salt_raw, digest_raw = hashed_password.split("$", 3)
        iterations = int(iterations_raw)
        salt = _b64_decode(salt_raw)
        expected_digest = _b64_decode(digest_raw)
    except (ValueError, TypeError):
        return False

    computed_digest = hashlib.pbkdf2_hmac("sha256", plain_password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(computed_digest, expected_digest)


def create_access_token(subject: str, token_version: int = 0) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "tv": token_version,
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(subject: str, jti: str | None = None) -> str:
    expire = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "refresh",
        "jti": jti or str(uuid4()),
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
