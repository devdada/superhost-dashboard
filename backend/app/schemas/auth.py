from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthUserResponse(BaseModel):
    email: str
    role: str = "admin"
