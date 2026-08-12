from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.db.database import engine, Base
from app.models import user, image_generation, chat_session
from app.api.routes import generate, history, auth, sessions

app = FastAPI(title="AI Image Generation Platform  API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/generated_images", StaticFiles(directory="generated_images"), name="generated_images")

app.include_router(auth.router)
app.include_router(sessions.router)
app.include_router(generate.router)
app.include_router(history.router)

@app.on_event("startup")
def on_startup():
    # Create database tables
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "ok"}