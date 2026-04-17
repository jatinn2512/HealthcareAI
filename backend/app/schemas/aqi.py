from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AqiSnapshotCreate(BaseModel):
    city: str = Field(min_length=2, max_length=100)
    aqi_value: int = Field(ge=0, le=500)
    category: str = Field(min_length=2, max_length=40)
    pm25: float | None = None
    pm10: float | None = None
    co: float | None = None
    no2: float | None = None
    notes: str | None = None


class AqiSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    city: str
    aqi_value: int
    category: str
    pm25: float | None
    pm10: float | None
    co: float | None
    no2: float | None
    notes: str | None
    captured_at: datetime
