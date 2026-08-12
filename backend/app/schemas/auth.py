from pydantic import BaseModel, EmailStr, ConfigDict
from uuid import UUID

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: EmailStr

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut