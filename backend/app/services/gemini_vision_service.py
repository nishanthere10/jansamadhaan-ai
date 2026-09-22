"""
Gemini Vision Analysis Service
------------------------------
A robust, modular image analysis service using Google's official `google-genai` SDK
configured for Gemini Flash on the free tier (15 RPM limits).

Handles:
- Local file paths, byte buffers/BytesIO, Base64 strings, and public URLs.
- Byte-level magic number MIME-type auto-detection (PNG, JPEG, WEBP, HEIC, GIF).
- Native structured JSON output mode via Gemini's `response_mime_type` and `response_schema`.
- Exponential backoff retry logic for HTTP 429 (RESOURCE_EXHAUSTED) and 503 rate limits.
- Safe payload size guards (<20MB inline).
"""

import base64
import io
import json
import logging
import os
import random
import re
import time
from pathlib import Path
from typing import Any

import requests
from google import genai
from google.genai import types
from google.genai.errors import APIError

logger = logging.getLogger(__name__)

# Default free-tier model (15 RPM, high multimodal accuracy)
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
MAX_INLINE_IMAGE_BYTES = 20 * 1024 * 1024  # 20 MB API limit

# Aliases for deprecated or legacy model names
MODEL_ALIASES = {
    "gemini-2.0-flash": "gemini-2.5-flash",
    "gemini-1.5-flash": "gemini-2.5-flash",
    "gemini-flash": "gemini-2.5-flash",
}


# ── Custom Exceptions ───────────────────────────────────────────────────────────

class GeminiVisionError(Exception):
    """Base exception for all Gemini Vision service errors."""
    pass


class GeminiConfigurationError(GeminiVisionError):
    """Raised when GEMINI_API_KEY is missing or invalid."""
    pass


class InvalidImageError(GeminiVisionError):
    """Raised when an image cannot be fetched, decoded, or is empty."""
    pass


class PayloadTooLargeError(GeminiVisionError):
    """Raised when an image exceeds Gemini's 20MB inline payload limit."""
    pass


class RateLimitExceededError(GeminiVisionError):
    """Raised when max retries are exceeded for rate-limiting (429/503)."""
    pass


class GeminiResponseParsingError(GeminiVisionError):
    """Raised when JSON parsing of a structured response fails."""
    def __init__(self, message: str, raw_text: str):
        super().__init__(message)
        self.raw_text = raw_text


# ── MIME Type Detection ────────────────────────────────────────────────────────

def detect_mime_type(data: bytes, fallback: str = "image/jpeg") -> str:
    """
    Auto-detects image MIME type from binary magic bytes.
    Supports PNG, JPEG, WEBP, HEIC/HEIF, and GIF.
    """
    if not data or len(data) < 12:
        return fallback

    # JPEG: starts with \xFF\xD8\xFF
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"

    # PNG: starts with \x89PNG\r\n\x1a\n
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"

    # WEBP: starts with RIFF and has WEBP at index 8..12
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"

    # GIF: GIF87a or GIF89a
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"

    # HEIC / HEIF / AVIF: bytes 4..8 == b"ftyp" with brand check
    if data[4:8] == b"ftyp":
        brand = data[8:12].lower()
        if brand in (b"heic", b"heix", b"hevc", b"heim", b"heis", b"mif1", b"msf1"):
            return "image/heic"
        if brand in (b"avif", b"avis"):
            return "image/avif"
        return "image/heic"

    return fallback


# ── Image Normalization Helper ──────────────────────────────────────────────────

def _normalize_image_payload(
    image: str | bytes | bytearray | io.BytesIO | Path,
    explicit_mime: str | None = None
) -> tuple[bytes, str]:
    """
    Resolves various image representations into (raw_bytes, detected_mime_type).
    Handles:
      1. Local file paths (str or Path)
      2. In-memory buffers (bytes, bytearray, BytesIO)
      3. Base64 strings (with or without 'data:image/...;base64,' prefix)
      4. Public URLs (http:// or https://)
    """
    raw_bytes: bytes = b""

    # 1. In-memory buffer / bytes
    if isinstance(image, (bytes, bytearray)):
        raw_bytes = bytes(image)
    elif isinstance(image, io.BytesIO):
        raw_bytes = image.getvalue()
    elif isinstance(image, Path):
        if not image.is_file():
            raise InvalidImageError(f"Image file does not exist: {image}")
        raw_bytes = image.read_bytes()

    # 2. String inputs: URL, Data URI, File Path, or raw Base64
    elif isinstance(image, str):
        image_str = image.strip()

        # 2a. Public URL
        if image_str.startswith(("http://", "https://")):
            try:
                logger.info(f"Downloading image from public URL: {image_str[:80]}...")
                response = requests.get(image_str, timeout=(5, 15), stream=True)
                response.raise_for_status()

                # Read safely with size limit enforcement
                chunks = []
                total_size = 0
                for chunk in response.iter_content(chunk_size=65536):
                    total_size += len(chunk)
                    if total_size > MAX_INLINE_IMAGE_BYTES:
                        raise PayloadTooLargeError(
                            f"Image from URL exceeds 20MB limit ({total_size} bytes read so far)."
                        )
                    chunks.append(chunk)

                raw_bytes = b"".join(chunks)

                # Use Content-Type header if explicit_mime wasn't provided
                if not explicit_mime:
                    header_mime = response.headers.get("content-type", "").split(";")[0].strip().lower()
                    if header_mime.startswith("image/"):
                        explicit_mime = header_mime

            except requests.RequestException as e:
                raise InvalidImageError(f"Failed to fetch image from URL: {e}") from e

        # 2b. Data URI base64 (e.g. data:image/png;base64,iVBORw...)
        elif image_str.startswith("data:image/"):
            match = re.match(r"^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$", image_str, re.DOTALL)
            if match:
                if not explicit_mime:
                    explicit_mime = match.group(1).lower()
                b64_content = match.group(2)
                try:
                    raw_bytes = base64.b64decode(b64_content)
                except Exception as e:
                    raise InvalidImageError(f"Invalid base64 payload in data URI: {e}") from e
            else:
                raise InvalidImageError("Malformed data:image URI format.")

        # 2c. Local filesystem path or path-like string
        elif (
            image_str.lower().endswith(
                (".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif", ".bmp", ".tiff")
            )
            or "/" in image_str
            or "\\" in image_str
        ):
            if not os.path.exists(image_str):
                raise InvalidImageError(f"Image file does not exist: '{image_str}'")
            try:
                with open(image_str, "rb") as f:
                    raw_bytes = f.read()
            except Exception as e:
                raise InvalidImageError(f"Failed to read image file '{image_str}': {e}") from e
        elif os.path.exists(image_str):
            try:
                with open(image_str, "rb") as f:
                    raw_bytes = f.read()
            except Exception as e:
                raise InvalidImageError(f"Failed to read image file '{image_str}': {e}") from e

        # 2d. Plain Base64 string
        else:
            try:
                raw_bytes = base64.b64decode(image_str, validate=True)
            except Exception as e:
                raise InvalidImageError(
                    "Image string is neither a valid file path, URL, data URI, nor decodable base64 string."
                ) from e

    else:
        raise InvalidImageError(f"Unsupported image type: {type(image).__name__}")

    # Validation checks
    if not raw_bytes:
        raise InvalidImageError("Image payload is empty (0 bytes).")

    if len(raw_bytes) > MAX_INLINE_IMAGE_BYTES:
        raise PayloadTooLargeError(
            f"Image size ({len(raw_bytes)} bytes) exceeds maximum allowable inline limit of {MAX_INLINE_IMAGE_BYTES} bytes (20MB)."
        )

    # Detect MIME type
    final_mime = explicit_mime or detect_mime_type(raw_bytes, fallback="image/jpeg")
    return raw_bytes, final_mime


# ── Core Service Class ──────────────────────────────────────────────────────────

class GeminiVisionService:
    """
    Reusable Gemini Flash vision analyzer with automatic retries and structured output.
    """

    def __init__(self, api_key: str | None = None):
        # API Key precedence: explicit arg -> GEMINI_API_KEY env var -> Settings
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            try:
                from app.core.config import settings
                self.api_key = settings.GEMINI_API_KEY
            except Exception:
                pass

        if not self.api_key:
            logger.warning(
                "GEMINI_API_KEY is not configured. Service calls will fail until the key is provided."
            )
            self._client = None
        else:
            self._client = genai.Client(api_key=self.api_key)

    @property
    def client(self) -> genai.Client:
        """Returns initialized genai Client, or attempts lazy re-initialization if env key was updated."""
        if self._client is not None:
            return self._client

        key = os.environ.get("GEMINI_API_KEY")
        if not key:
            try:
                from app.core.config import settings
                key = settings.GEMINI_API_KEY
            except Exception:
                pass

        if not key:
            raise GeminiConfigurationError(
                "GEMINI_API_KEY is not set. Please add GEMINI_API_KEY to your environment or .env file."
            )

        self.api_key = key
        self._client = genai.Client(api_key=self.api_key)
        return self._client

    def analyze(
        self,
        image: str | bytes | bytearray | io.BytesIO | Path,
        prompt: str,
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Synchronously analyzes an image using Gemini Flash with exponential backoff.
        """
        raw_model = options.get("model") or DEFAULT_GEMINI_MODEL
        model_name = MODEL_ALIASES.get(raw_model, raw_model)
        system_instruction = options.get("systemInstruction") or options.get("system_instruction")
        explicit_mime = options.get("mimeType") or options.get("mime_type")
        response_schema = options.get("responseSchema") or options.get("response_schema")
        json_mode = bool(options.get("jsonMode") or options.get("json_mode") or response_schema)
        max_retries = int(options.get("maxRetries") or options.get("max_retries") or 3)
        temperature = float(options.get("temperature", 0.2))

        # 1. Normalize and validate image payload
        image_bytes, detected_mime = _normalize_image_payload(image, explicit_mime=explicit_mime)

        # 2. Build Gemini Part & GenerateContentConfig
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=detected_mime)

        config_kwargs: dict[str, Any] = {
            "temperature": temperature,
        }

        if system_instruction:
            config_kwargs["system_instruction"] = str(system_instruction)

        if json_mode:
            config_kwargs["response_mime_type"] = "application/json"
            if response_schema:
                config_kwargs["response_schema"] = response_schema

        config = types.GenerateContentConfig(**config_kwargs)

        # 3. Retry loop with exponential backoff for free-tier rate limits (429 / 503)
        client = self.client
        last_error = None
        base_delay = 2.0

        for attempt in range(max_retries + 1):
            try:
                logger.info(
                    f"[GeminiVision] Requesting model={model_name}, mime={detected_mime}, "
                    f"size={len(image_bytes)} bytes (attempt {attempt + 1}/{max_retries + 1})"
                )

                response = client.models.generate_content(
                    model=model_name,
                    contents=[prompt, image_part],
                    config=config,
                )

                raw_text = response.text or ""
                parsed_data = None

                if json_mode and raw_text:
                    try:
                        parsed_data = json.loads(raw_text)
                    except json.JSONDecodeError as json_err:
                        # Attempt markdown codeblock strip if model wrapped in ```json
                        cleaned = raw_text.strip()
                        if cleaned.startswith("```json") and cleaned.endswith("```"):
                            cleaned = cleaned[7:-3].strip()
                        elif cleaned.startswith("```") and cleaned.endswith("```"):
                            cleaned = cleaned[3:-3].strip()

                        try:
                            parsed_data = json.loads(cleaned)
                        except Exception:
                            logger.warning(f"Failed to parse JSON response from Gemini: {json_err}")
                            parsed_data = None

                return {
                    "text": raw_text,
                    "data": parsed_data,
                    "model": model_name,
                    "mime_type": detected_mime,
                    "finish_reason": getattr(response.candidates[0], "finish_reason", None) if response.candidates else None,
                    "success": True,
                }

            except APIError as api_err:
                last_error = api_err
                code = getattr(api_err, "code", None)
                message = str(api_err).lower()

                # Check for rate limiting / resource exhaustion (HTTP 429 or 503)
                is_rate_limit = (
                    code in (429, 503)
                    or "resource_exhausted" in message
                    or "rate limit" in message
                    or "quota" in message
                )

                if is_rate_limit and attempt < max_retries:
                    sleep_time = (base_delay * (2 ** attempt)) + random.uniform(0.2, 0.8)
                    logger.warning(
                        f"[GeminiVision] Rate limited (attempt {attempt + 1}). "
                        f"Backing off for {sleep_time:.2f}s before retry... Error: {api_err}"
                    )
                    time.sleep(sleep_time)
                    continue

                # Non-retryable API error or retries exhausted
                logger.error(f"[GeminiVision] API error during analysis: {api_err}")
                if is_rate_limit:
                    raise RateLimitExceededError(
                        f"Gemini free-tier rate limit exceeded after {max_retries} retries: {api_err}"
                    ) from api_err
                raise GeminiVisionError(f"Gemini API error: {api_err}") from api_err

            except requests.RequestException as net_err:
                last_error = net_err
                if attempt < max_retries:
                    sleep_time = (base_delay * (2 ** attempt)) + random.uniform(0.1, 0.5)
                    logger.warning(f"[GeminiVision] Network error on attempt {attempt + 1}. Retrying in {sleep_time:.2f}s: {net_err}")
                    time.sleep(sleep_time)
                    continue
                raise GeminiVisionError(f"Network failure communicating with Gemini: {net_err}") from net_err

            except Exception as unk_err:
                logger.exception(f"[GeminiVision] Unexpected error during image analysis: {unk_err}")
                raise GeminiVisionError(f"Unexpected vision analysis error: {unk_err}") from unk_err

        raise RateLimitExceededError(f"Failed after {max_retries} attempts. Last error: {last_error}")

    async def analyze_async(
        self,
        image: str | bytes | bytearray | io.BytesIO | Path,
        prompt: str,
        options: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """
        Asynchronously analyzes an image using Gemini Flash with exponential backoff.
        """
        import asyncio

        options = options or {}
        raw_model = options.get("model") or DEFAULT_GEMINI_MODEL
        model_name = MODEL_ALIASES.get(raw_model, raw_model)
        system_instruction = options.get("systemInstruction") or options.get("system_instruction")
        explicit_mime = options.get("mimeType") or options.get("mime_type")
        response_schema = options.get("responseSchema") or options.get("response_schema")
        json_mode = bool(options.get("jsonMode") or options.get("json_mode") or response_schema)
        max_retries = int(options.get("maxRetries") or options.get("max_retries") or 3)
        temperature = float(options.get("temperature", 0.2))

        image_bytes, detected_mime = _normalize_image_payload(image, explicit_mime=explicit_mime)
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=detected_mime)

        config_kwargs: dict[str, Any] = {"temperature": temperature}
        if system_instruction:
            config_kwargs["system_instruction"] = str(system_instruction)
        if json_mode:
            config_kwargs["response_mime_type"] = "application/json"
            if response_schema:
                config_kwargs["response_schema"] = response_schema

        config = types.GenerateContentConfig(**config_kwargs)

        client = self.client
        last_error = None
        base_delay = 2.0

        for attempt in range(max_retries + 1):
            try:
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=[prompt, image_part],
                    config=config,
                )

                raw_text = response.text or ""
                parsed_data = None

                if json_mode and raw_text:
                    try:
                        parsed_data = json.loads(raw_text)
                    except json.JSONDecodeError:
                        cleaned = raw_text.strip()
                        if cleaned.startswith("```json") and cleaned.endswith("```"):
                            cleaned = cleaned[7:-3].strip()
                        elif cleaned.startswith("```") and cleaned.endswith("```"):
                            cleaned = cleaned[3:-3].strip()
                        try:
                            parsed_data = json.loads(cleaned)
                        except Exception:
                            parsed_data = None

                return {
                    "text": raw_text,
                    "data": parsed_data,
                    "model": model_name,
                    "mime_type": detected_mime,
                    "finish_reason": getattr(response.candidates[0], "finish_reason", None) if response.candidates else None,
                    "success": True,
                }

            except APIError as api_err:
                last_error = api_err
                code = getattr(api_err, "code", None)
                message = str(api_err).lower()
                is_rate_limit = (
                    code in (429, 503)
                    or "resource_exhausted" in message
                    or "rate limit" in message
                )

                if is_rate_limit and attempt < max_retries:
                    sleep_time = (base_delay * (2 ** attempt)) + random.uniform(0.2, 0.8)
                    await asyncio.sleep(sleep_time)
                    continue

                if is_rate_limit:
                    raise RateLimitExceededError(
                        f"Gemini free-tier rate limit exceeded after {max_retries} retries: {api_err}"
                    ) from api_err
                raise GeminiVisionError(f"Gemini API error: {api_err}") from api_err

            except Exception as e:
                last_error = e
                if attempt < max_retries:
                    await asyncio.sleep((base_delay * (2 ** attempt)) + random.uniform(0.1, 0.5))
                    continue
                raise GeminiVisionError(f"Unexpected error: {e}") from e

        raise RateLimitExceededError(f"Failed after {max_retries} retries: {last_error}")


# ── Global Singleton Instance & Public Top-Level Functions ─────────────────────

_default_service: GeminiVisionService | None = None


def get_gemini_vision_service(api_key: str | None = None) -> GeminiVisionService:
    """Returns or creates a shared GeminiVisionService instance."""
    global _default_service
    if _default_service is None or api_key:
        _default_service = GeminiVisionService(api_key=api_key)
    return _default_service


def analyzeImage(
    image: str | bytes | bytearray | io.BytesIO | Path,
    prompt: str,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Public utility function matching the requirement specification:
    analyzeImage(image, prompt, options)

    Parameters:
        image: Local file path, bytes/buffer, base64 string, or public URL.
        prompt: Text instruction describing what to extract or analyze.
        options:
            - systemInstruction: Optional system persona or instructions.
            - responseSchema: Pydantic model or dict schema for native structured JSON.
            - jsonMode: Boolean flag to enforce JSON output.
            - mimeType: Explicit image MIME type (defaults to auto-detected).
            - model: Default 'gemini-2.0-flash'.
            - maxRetries: Number of retries on HTTP 429 / 503 (default: 3).

    Returns:
        dict: {"text": str, "data": dict|list|None, "model": str, "mime_type": str, "success": bool}
    """
    service = get_gemini_vision_service()
    return service.analyze(image=image, prompt=prompt, options=options)


# Idiomatic Python aliases
analyze_image = analyzeImage


async def analyzeImageAsync(
    image: str | bytes | bytearray | io.BytesIO | Path,
    prompt: str,
    options: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Asynchronous version of analyzeImage."""
    service = get_gemini_vision_service()
    return await service.analyze_async(image=image, prompt=prompt, options=options)


analyze_image_async = analyzeImageAsync
