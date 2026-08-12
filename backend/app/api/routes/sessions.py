from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID

from app.db.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.chat_session import ChatSession
from app.schemas.chat_session import SessionCreate, SessionOut, SessionUpdate

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

@router.post("", response_model=SessionOut, status_code=201)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ChatSession(
        user_id=current_user.id,
        title=payload.title
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

@router.get("", response_model=list[SessionOut])
def list_sessions(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(desc(ChatSession.updated_at))
        .offset(skip)
        .limit(limit)
        .all()
    )

def _get_owned_session(session_id: UUID, db: Session, current_user: User) -> ChatSession:
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return session

@router.put("/{session_id}", response_model=SessionOut)
def rename_session(
    session_id: UUID,
    payload: SessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_owned_session(session_id, db, current_user)
    session.title = payload.title
    db.commit()
    db.refresh(session)
    return session
    
@router.delete("/{session_id}", status_code=204)
def delete_session(
    session_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = _get_owned_session(session_id, db, current_user)
    db.delete(session)
    db.commit()