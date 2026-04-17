from typing import Literal

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.orm import Session

from app.db.session import get_core_db, get_tracking_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UpdateProfileRequest,
    UpdateSettingsRequest,
    UserMeResponse,
    UserSettingsResponse,
)
from app.schemas.common import MessageResponse
from app.services import auth_service
from app.services.plan_service import ensure_default_plans, subscribe_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserMeResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_core_db)):
    ensure_default_plans(db)
    user = auth_service.create_user(db, payload)
    subscribe_user(db, user, plan_code="current", billing_cycle="monthly")
    return user


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_core_db)):
    return auth_service.login_user(
        db,
        payload,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, request: Request, db: Session = Depends(get_core_db)):
    return auth_service.refresh_login(
        db,
        payload.refresh_token,
        user_agent=request.headers.get("user-agent"),
        ip_address=request.client.host if request.client else None,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(payload: RefreshRequest, db: Session = Depends(get_core_db)):
    auth_service.logout_with_refresh_token(db, payload.refresh_token)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserMeResponse)
def me(current_user: User = Depends(auth_service.get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMeResponse)
def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_core_db),
):
    return auth_service.update_profile(db, current_user, payload)


@router.get("/settings", response_model=UserSettingsResponse)
def get_settings(
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_core_db),
):
    return auth_service.get_user_settings(db, current_user)


@router.patch("/settings", response_model=UserSettingsResponse)
def update_settings(
    payload: UpdateSettingsRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_core_db),
):
    return auth_service.update_user_settings(db, current_user, payload)


@router.get("/export/pdf")
def export_user_data_pdf(
    scope: Literal["complete", "weekly", "this_month"] = Query(default="complete"),
    current_user: User = Depends(auth_service.get_current_user),
    core_db: Session = Depends(get_core_db),
    tracking_db: Session = Depends(get_tracking_db),
):
    pdf_data = auth_service.export_user_data_pdf(core_db, tracking_db, current_user, scope=scope)
    filename = f"curasync-user-data-{scope}-{current_user.id}.pdf"
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
