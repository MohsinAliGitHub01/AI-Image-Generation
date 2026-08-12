from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

class SessionCreate(BaseModel):
    title: str = "New Chat"

class SessionUpdate(BaseModel):
    title: str

class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime