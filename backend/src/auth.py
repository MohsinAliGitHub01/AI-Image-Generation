from pydantic import BaseModel, Emailstr, ConfigDict

from uuid import UUID

class RegisterRequest(BaseModel):
    email: Emailstr
    password: str

class LoginRequest(BaseModel):
    email: Emailstr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: Emailstr

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut