import uuid
import os

import httpx
from fastapi import HTTPException

from app.core.config import settings

GENERATED_DIR = "generated_images"
os.makedirs(GENERATED_DIR, exist_ok=True)

async def generate_image(prompt: str) -> str:
    if not settings.STABILITY_API_KEY:
        raise HTTPException(status_code=500, detail="STABILITY_API_KEY is not set in the environment variables")

    headers = {
        "Authorization": f"Bearer {settings.STABILITY_API_KEY}",
        "Accept": "image/*",
    }
    files = {"none": ""}
    data = {"prompt": prompt, "output_format": "png"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            settings.STABILITY_API_URL,
            headers=headers,
            files=files,
            data=data,
        )
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"AI provider error: {response.text}")

    filename = f"{uuid.uuid4()}.png"
    file_path = os.path.join(GENERATED_DIR, filename)
    with open(file_path, "wb") as f:
        f.write(response.content)
    return f"/generated_images/{filename}"