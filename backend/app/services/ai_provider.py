import asyncio
import io
import uuid
import os

import httpx
from fastapi import HTTPException
from huggingface_hub import InferenceClient

from app.core.config import settings

GENERATED_DIR = "generated_images"
os.makedirs(GENERATED_DIR, exist_ok=True)

HUGGINGFACE_MODEL = "black-forest-labs/FLUX.1-schnell"


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


def _huggingface_generate_sync(prompt: str) -> bytes:
    """
    Runs synchronously (huggingface_hub's InferenceClient is sync).
    Called via asyncio.to_thread so it doesn't block the event loop.
    The client auto-selects a working provider for this model.
    """
    client = InferenceClient(provider="together", api_key=settings.HUGGINGFACE_API_KEY)
    image = client.text_to_image(prompt, model=HUGGINGFACE_MODEL)  # returns a PIL.Image
    buf = io.BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


async def _generate_via_huggingface(prompt: str) -> str:
    if not settings.HUGGINGFACE_API_KEY:
        raise RuntimeError("HUGGINGFACE_API_KEY is not configured")

    try:
        image_bytes = await asyncio.to_thread(_huggingface_generate_sync, prompt)
    except Exception as e:
        raise RuntimeError(f"Hugging Face error: {e}")

    return _save_image(image_bytes)


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