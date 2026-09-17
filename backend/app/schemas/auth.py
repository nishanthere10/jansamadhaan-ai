
from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    password: str
    role: str | None = "citizen"  # Always overridden to 'citizen' server-side

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
