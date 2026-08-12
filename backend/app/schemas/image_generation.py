from datetime import datetime
from pydantic import BaseModel, ConfigDict
from uuid import UUID

class GenerateRequest(BaseModel):
    prompt: str

class ImageGenerationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    session_id: UUID
    prompt: str
    image_url: str
    created_at: datetime