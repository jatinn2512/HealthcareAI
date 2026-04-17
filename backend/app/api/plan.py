from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_core_db
from app.models.user import User
from app.schemas.plan import PlanOut, SubscribeRequest, SubscriptionOut
from app.services import auth_service, plan_service

router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get("", response_model=list[PlanOut])
def list_available_plans(db: Session = Depends(get_core_db)):
    plan_service.ensure_default_plans(db)
    return plan_service.list_plans(db)


@router.get("/me", response_model=SubscriptionOut | None)
def my_subscription(current_user: User = Depends(auth_service.get_current_user), db: Session = Depends(get_core_db)):
    sub = plan_service.get_active_subscription(db, current_user.id)
    if not sub:
        return None
    return SubscriptionOut(
        plan_code=sub.plan.code,
        plan_name=sub.plan.name,
        billing_cycle=sub.billing_cycle,
        status=sub.status,
        started_at=sub.started_at,
        ends_at=sub.ends_at,
    )


@router.post("/me", response_model=SubscriptionOut)
def update_subscription(
    payload: SubscribeRequest,
    current_user: User = Depends(auth_service.get_current_user),
    db: Session = Depends(get_core_db),
):
    try:
        sub = plan_service.subscribe_user(db, current_user, payload.plan_code, payload.billing_cycle)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    db.refresh(sub, attribute_names=["plan"])
    return SubscriptionOut(
        plan_code=sub.plan.code,
        plan_name=sub.plan.name,
        billing_cycle=sub.billing_cycle,
        status=sub.status,
        started_at=sub.started_at,
        ends_at=sub.ends_at,
    )
