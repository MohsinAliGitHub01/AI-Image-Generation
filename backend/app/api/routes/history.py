from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.image_generation import ImageGeneration
from app.schemas.image_generation import ImageGenerationOut
from typing import Optional

router = APIRouter(prefix="/api/history", tags=["History"])

@router.get("/", response_model=list[ImageGenerationOut])
def get_history(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = Query(None, description="Search term for filtering history"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(ImageGeneration).filter(ImageGeneration.user_id == current_user.id)

    if search:
        query = query.filter(ImageGeneration.prompt.ilike(f"%{search}%"))

    return query.order_by(ImageGeneration.created_at.desc()).offset(skip).limit(limit).all()