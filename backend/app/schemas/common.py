from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    message: str


class TimestampedModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    created_at: datetime
