from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=7, max_length=20)
    email: str = Field(min_length=5, max_length=255)
    age: int | None = Field(default=None, ge=18, le=100)
    gender: str | None = Field(default=None, max_length=20)
    password: str = Field(max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or "." not in value:
            raise ValueError("Enter a valid email")
        parts = value.split("@")
        if len(parts) != 2 or not parts[0] or not parts[1]:
            raise ValueError("Enter a valid email")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return value


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or "." not in value:
            raise ValueError("Enter a valid email")
        parts = value.split("@")
        if len(parts) != 2 or not parts[0] or not parts[1]:
            raise ValueError("Enter a valid email")
        return value


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        if "@" not in value or "." not in value:
            raise ValueError("Enter a valid email")
        parts = value.split("@")
        if len(parts) != 2 or not parts[0] or not parts[1]:
            raise ValueError("Enter a valid email")
        return value


class ForgotPasswordResponse(BaseModel):
    message: str
    reset_token: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return value


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    height_cm: float | None
    weight_kg: float | None
    target_weight_kg: float | None
    activity_level: str | None
    eyesight_left: str | None
    eyesight_right: str | None
    disability_status: str | None
    chronic_conditions: str | None
    allergies: str | None
    smoking_status: str | None
    alcohol_intake: str | None
    medical_notes: str | None


class UserMeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    phone: str
    email: str
    age: int
    gender: str | None
    is_active: bool
    created_at: datetime
    last_login_at: datetime | None
    profile: UserProfileResponse | None = None


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, min_length=7, max_length=20)
    age: int | None = Field(default=None, ge=18, le=100)
    gender: str | None = Field(default=None, max_length=20)
    height_cm: float | None = Field(default=None, gt=0)
    weight_kg: float | None = Field(default=None, gt=0)
    activity_level: str | None = Field(default=None, max_length=30)
    eyesight_left: str | None = Field(default=None, max_length=30)
    eyesight_right: str | None = Field(default=None, max_length=30)
    disability_status: str | None = Field(default=None, max_length=30)
    chronic_conditions: str | None = None
    allergies: str | None = None
    smoking_status: str | None = Field(default=None, max_length=30)
    alcohol_intake: str | None = Field(default=None, max_length=30)
    medical_notes: str | None = None


class UpdateSettingsRequest(BaseModel):
    theme: str | None = Field(default=None, max_length=20)
    units: str | None = Field(default=None, max_length=20)
    notifications_enabled: bool | None = None
    email_alerts_enabled: bool | None = None
    community_visibility: str | None = Field(default=None, max_length=20)
    location_access_for_aqi: bool | None = None


class UserSettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    theme: str
    units: str
    notifications_enabled: bool
    email_alerts_enabled: bool
    community_visibility: str
    location_access_for_aqi: bool
