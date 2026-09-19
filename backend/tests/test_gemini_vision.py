"""
Unit Tests for Gemini Vision Service
-------------------------------------
Tests MIME-type detection, normalization, payload limits,
configuration validation, and rate limit retry backoff.
"""

from unittest.mock import MagicMock, patch

import pytest
from google.genai.errors import APIError

from app.services.gemini_vision_service import (
    GeminiConfigurationError,
    GeminiVisionService,
    InvalidImageError,
    PayloadTooLargeError,
    _normalize_image_payload,
    detect_mime_type,
)


def test_mime_type_detection_magic_bytes():
    """Verify byte-level MIME type detection for all supported formats."""
    jpeg_header = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00"
    png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    webp_header = b"RIFF\x00\x00\x00\x00WEBPVP8 "
    heic_header = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00"
    gif_header = b"GIF89a\x01\x00\x01\x00\x80\x00\x00"

    assert detect_mime_type(jpeg_header) == "image/jpeg"
    assert detect_mime_type(png_header) == "image/png"
    assert detect_mime_type(webp_header) == "image/webp"
    assert detect_mime_type(heic_header) == "image/heic"
    assert detect_mime_type(gif_header) == "image/gif"
    assert detect_mime_type(b"short", fallback="image/png") == "image/png"


def test_normalize_payload_base64_data_uri():
    """Verify data:image/...;base64 parsing and decoding."""
    # 1x1 transparent PNG base64
    data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    raw_bytes, mime = _normalize_image_payload(data_uri)
    assert mime == "image/png"
    assert len(raw_bytes) > 0


def test_normalize_payload_invalid_inputs():
    """Verify handling of invalid or empty image inputs."""
    with pytest.raises(InvalidImageError):
        _normalize_image_payload(b"")

    with pytest.raises(InvalidImageError):
        _normalize_image_payload("non_existent_file_path_xyz123.jpg")


def test_normalize_payload_size_limit():
    """Verify payload size limit guard (>20MB)."""
    large_bytes = b"x" * (21 * 1024 * 1024)
    with pytest.raises(PayloadTooLargeError):
        _normalize_image_payload(large_bytes)


def test_configuration_missing_key():
    """Verify clear error message when GEMINI_API_KEY is not set."""
    with patch.dict("os.environ", {}, clear=True), patch("app.core.config.settings.GEMINI_API_KEY", ""):
        service = GeminiVisionService(api_key=None)
        service._client = None
        with pytest.raises(GeminiConfigurationError):
            _ = service.client


def test_analyze_image_structured_output_mocked():
    """Verify analyzeImage handles structured JSON output and Pydantic schema."""
    fake_json = '{"issue": "pothole", "severity": "High"}'
    mock_candidate = MagicMock()
    mock_candidate.finish_reason = "STOP"

    mock_response = MagicMock()
    mock_response.text = fake_json
    mock_response.candidates = [mock_candidate]

    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_response
        mock_client_cls.return_value = mock_client

        sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        service = GeminiVisionService(api_key="test-api-key")

        result = service.analyze(
            image=sample_b64,
            prompt="Analyze defect",
            options={"jsonMode": True, "model": "gemini-2.5-flash"}
        )

        assert result["success"] is True
        assert result["data"] == {"issue": "pothole", "severity": "High"}
        assert result["model"] == "gemini-2.5-flash"
        assert result["mime_type"] == "image/png"


def test_rate_limit_retry_backoff():
    """Verify retry with exponential backoff on HTTP 429."""
    rate_limit_err = APIError(429, {"error": {"message": "Resource exhausted: 429 quota exceeded", "code": 429}})

    mock_candidate = MagicMock()
    mock_response = MagicMock()
    mock_response.text = "Analysis succeeded after retry"
    mock_response.candidates = [mock_candidate]

    with patch("google.genai.Client") as mock_client_cls:
        mock_client = MagicMock()
        # Fail first time with 429, then succeed on second attempt
        mock_client.models.generate_content.side_effect = [rate_limit_err, mock_response]
        mock_client_cls.return_value = mock_client

        sample_b64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        service = GeminiVisionService(api_key="test-api-key")

        with patch("time.sleep") as mock_sleep:
            result = service.analyze(
                image=sample_b64,
                prompt="Analyze",
                options={"maxRetries": 2}
            )
            assert result["success"] is True
            assert result["text"] == "Analysis succeeded after retry"
            assert mock_sleep.called
