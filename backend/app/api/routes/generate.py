from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.image_generation import ImageGeneration
from app.schemas.image_generation import ImageGenerationOut, GenerateRequest
from app.services.ai_provider import generate_image
from app.models.chat_session import ChatSession

router = APIRouter(prefix="/api/sessions", tags=["generate"])

@router.post("/{session_id}/generate", response_model=ImageGenerationOut, status_code=201)
async def generate(
    session_id: UUID,
    payload: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    image_url = await generate_image(payload.prompt)

    generation = ImageGeneration(
        session_id=session.id,
        user_id=current_user.id,
        prompt=payload.prompt,
        image_url=image_url,
    )
    db.add(generation)
    db.commit()
    db.refresh(generation)
    return generation

@router.get("/{session_id}/images", response_model=list[ImageGenerationOut])
def list_session_images(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")

    return (
        db.query(ImageGeneration)
        .filter(ImageGeneration.session_id == session.id)
        .order_by(ImageGeneration.created_at.desc())
        .all()
    )