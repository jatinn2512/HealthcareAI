from fastapi import APIRouter

from app.schemas.health import HealthRiskRequest, HealthRiskResponse
from app.services import health_service

router = APIRouter(prefix="/health", tags=["Health Risk"])


@router.post("/risk", response_model=HealthRiskResponse)
def assess_health_risk(payload: HealthRiskRequest) -> HealthRiskResponse:
    return health_service.assess_health_risk(payload)
