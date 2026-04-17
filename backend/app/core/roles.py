"""Application role identifiers (RBAC)."""

USER = "USER"
DOCTOR = "DOCTOR"
ADMIN = "ADMIN"

ALL_ROLES: tuple[str, ...] = (USER, DOCTOR, ADMIN)


def normalize_role(value: str | None) -> str:
    if not value:
        return USER
    upper = value.strip().upper()
    if upper in ALL_ROLES:
        return upper
    return USER
