from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PlanFeatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature_key: str
    feature_label: str


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    monthly_price_inr: int
    yearly_price_inr: int
    description: str
    is_active: bool
    features: list[PlanFeatureOut]


class SubscribeRequest(BaseModel):
    plan_code: str = Field(min_length=2, max_length=30)
    billing_cycle: str = Field(pattern="^(monthly|yearly)$")


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_code: str
    plan_name: str
    billing_cycle: str
    status: str
    started_at: datetime
    ends_at: datetime | None
