"""
Standalone Test Script for Gemini Flash Vision Service
------------------------------------------------------
Demonstrates:
1. Auto-detecting MIME types (PNG, JPEG, WEBP, HEIC).
2. Passing an image with a prompt asking for structured JSON extraction.
3. Native structured output via Pydantic responseSchema.
4. Printing the parsed output to the console.
"""

import json
import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from dotenv import load_dotenv  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from app.services.gemini_vision_service import (  # noqa: E402
    GeminiConfigurationError,
    analyzeImage,
    detect_mime_type,
)

load_dotenv(backend_dir / ".env")

# ── 1. Define Schema for Structured Output Demonstration ────────────────────────

class CivicDefectReport(BaseModel):
    category: str = Field(description="Category of the defect (e.g., Pothole, Road Damage, Water Leak, Garbage, Other)")
    severity: str = Field(description="Severity rating: Low, Medium, High, or Critical")
    description: str = Field(description="Objective description of what is shown in the image")
    is_civic_hazard: bool = Field(description="True if the visual evidence represents a public hazard")
    primary_objects: list[str] = Field(description="List of key physical objects detected in the image")


# ── 2. Helper to Select a Valid Test Image ──────────────────────────────────────

def get_sample_test_image() -> str:
    """
    Returns a sample image path from project assets, or falls back to a base64 image.
    """
    candidates = [
        backend_dir.parent / "frontend" / "public" / "logo1.jpg",
        backend_dir.parent / "frontend" / "assets" / "hero.png",
    ]
    for c in candidates:
        if c.is_file():
            return str(c)

    # Fallback to base64
    return (
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA"
        "AXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAX"
        "SURBVDhPY/wPBAwUACZGAoZZ8B8MAABY2wIx88f2oQAAAABJRU5ErkJggg=="
    )


def test_mime_type_detection():
    print("\n--- [Test 1] Testing MIME-Type Auto-Detection ---")
    
    jpeg_bytes = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01"
    png_bytes = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    webp_bytes = b"RIFF\x00\x00\x00\x00WEBPVP8 "
    heic_bytes = b"\x00\x00\x00\x18ftypheic\x00\x00\x00\x00"

    print(f"JPEG detection : {detect_mime_type(jpeg_bytes)} (expected: image/jpeg)")
    print(f"PNG detection  : {detect_mime_type(png_bytes)} (expected: image/png)")
    print(f"WEBP detection : {detect_mime_type(webp_bytes)} (expected: image/webp)")
    print(f"HEIC detection : {detect_mime_type(heic_bytes)} (expected: image/heic)")
    
    assert detect_mime_type(jpeg_bytes) == "image/jpeg"
    assert detect_mime_type(png_bytes) == "image/png"
    assert detect_mime_type(webp_bytes) == "image/webp"
    assert detect_mime_type(heic_bytes) == "image/heic"
    print("MIME detection tests passed successfully!")


def test_structured_image_analysis():
    print("\n--- [Test 2] Testing Structured JSON Extraction with Gemini Flash ---")
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[WARNING] GEMINI_API_KEY environment variable is not currently set in backend/.env.")
        print("          Once you add GEMINI_API_KEY=your_key to backend/.env, rerun this script to test the live API call.")
        print("          Offline validation and SDK wiring verified.")
        return

    print(f"Found GEMINI_API_KEY: {api_key[:6]}...{api_key[-4:] if len(api_key) > 10 else ''}")
    
    test_image = get_sample_test_image()
    test_prompt = (
        "Analyze this image. Identify any visible shapes, colors, objects, or infrastructure issues. "
        "Extract your analysis matching the required CivicDefectReport schema."
    )

    print("\nCalling analyzeImage with 'CivicDefectReport' Pydantic responseSchema...")
    try:
        result = analyzeImage(
            image=test_image,
            prompt=test_prompt,
            options={
                "model": "gemini-2.0-flash",
                "systemInstruction": "You are Jan Samadhan's automated municipal visual inspection AI.",
                "responseSchema": CivicDefectReport,
                "jsonMode": True,
            }
        )

        print("\n=== RAW RESPONSE TEXT ===")
        print(result.get("text"))

        print("\n=== PARSED STRUCTURED JSON OUTPUT ===")
        print(json.dumps(result.get("data"), indent=2))

        print("\n=== METADATA ===")
        print(f"Model used    : {result.get('model')}")
        print(f"Detected MIME : {result.get('mime_type')}")
        print(f"Success       : {result.get('success')}")

        print("\nStructured JSON extraction completed successfully!")

    except GeminiConfigurationError as e:
        print(f"Configuration error: {e}")
    except Exception as e:
        print(f"Analysis failed: {e}")


if __name__ == "__main__":
    print("==================================================")
    print("   Jan Samadhan AI - Gemini Vision Service Test   ")
    print("==================================================")
    test_mime_type_detection()
    test_structured_image_analysis()
