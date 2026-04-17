from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from app.models.user import User
from app.services import auth_service


def require_roles(*allowed_roles: str) -> Callable[..., User]:
    allowed = {role.strip().upper() for role in allowed_roles if role and role.strip()}

    def _dependency(user: User = Depends(auth_service.get_current_user)) -> User:
        if user.role.upper() not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return user

    return _dependency
