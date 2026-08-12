from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:qwe123@localhost:5432/ai_image_platform"
    JWT_SECRET_KEY: str = "your_secret_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    STABILITY_API_KEY: str = "sk-29aFdtlwJCMiV7u26IAIvsk6holKknmZWsLPTbRxtdGoUULY"
    STABILITY_API_URL: str = "https://api.stability.ai/v2beta/stable-image/generate/core"

    class Config:
        env_file = ".env"
    
settings = Settings()