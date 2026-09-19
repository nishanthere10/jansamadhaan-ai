
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    full_name: str = Field(..., min_length=2, description="Full name must be at least 2 characters")
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20, description="Valid phone number")
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    role: str | None = "citizen"

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, v: str) -> str:
        s = v.strip()
        if len(s) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return s

    @field_validator("phone")
    @classmethod
    def clean_phone(cls, v: str) -> str:
        s = v.strip()
        if len(s) < 7:
            raise ValueError("Phone number must be at least 7 characters")
        return s

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AadharLoginRequest(BaseModel):
    aadhar_number: str


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    full_name: str | None = None

class SignupResponseData(BaseModel):
    id: str
    email: str
    role: str

class LoginResponseData(BaseModel):
    access_token: str
    user: UserResponse

class BaseResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None
