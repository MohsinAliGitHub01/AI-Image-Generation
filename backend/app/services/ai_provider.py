# backend/app/services/ai_provider.py

import uuid
import os

import httpx
from fastapi import HTTPException

from app.core.config import settings

GENERATED_DIR = "generated_images"
os.makedirs(GENERATED_DIR, exist_ok=True)

HUGGINGFACE_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"
HUGGINGFACE_API_URL = f"https://api-inference.huggingface.co/models/{HUGGINGFACE_MODEL}"


def _save_image(image_bytes: bytes) -> str:
    filename = f"{uuid.uuid4()}.png"
    filepath = os.path.join(GENERATED_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(image_bytes)
    return f"/generated_images/{filename}"


async def _generate_via_stability(prompt: str) -> str:
    if not settings.STABILITY_API_KEY:
        raise RuntimeError("STABILITY_API_KEY is not configured")

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
        raise RuntimeError(f"Stability AI error ({response.status_code}): {response.text}")

    return _save_image(response.content)


async def _generate_via_huggingface(prompt: str) -> str:
    if not settings.HUGGINGFACE_API_KEY:
        raise RuntimeError("HUGGINGFACE_API_KEY is not configured")

    headers = {
        "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
    }
    payload = {"inputs": prompt}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            HUGGINGFACE_API_URL,
            headers=headers,
            json=payload,
        )

    # HF returns JSON (not an image) when the model is loading or errors out.
    content_type = response.headers.get("content-type", "")
    if response.status_code != 200 or "image" not in content_type:
        raise RuntimeError(f"Hugging Face error ({response.status_code}): {response.text}")

    return _save_image(response.content)


async def generate_image(prompt: str) -> str:
    """
    Tries Stability AI first. If that fails for any reason (out of credits,
    API error, timeout), falls back to Hugging Face. If both fail, raises
    a 502 back to the caller.
    """
    try:
        return await _generate_via_stability(prompt)
    except Exception as stability_error:
        try:
            return await _generate_via_huggingface(prompt)
        except Exception as huggingface_error:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Both AI providers failed. "
                    f"Stability AI: {stability_error} | Hugging Face: {huggingface_error}"
                ),
            )