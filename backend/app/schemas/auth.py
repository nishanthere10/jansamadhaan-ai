from pydantic import BaseModel, EmailStr
from typing import Optional

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    role: Optional[str] = "citizen"  # Always overridden to 'citizen' server-side

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AadharLoginRequest(BaseModel):
    aadhar_number: str


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    full_name: Optional[str] = None

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
    data: Optional[dict] = None
