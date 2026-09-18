import base64
import json
import logging
import os
from typing import Any

import requests
from groq import Groq

logger = logging.getLogger(__name__)

class ResolutionVerificationService:
    """
    Phase 4: Automated Proof-of-Work checking.
    When a field worker marks a task as resolved, this service uses
    Llama-4-Scout (Vision) to compare the "Before" photo with the "After" proof
    to verify authenticity and completion.
    """
    
    @classmethod
    def verify_resolution(cls, before_url: str, after_url: str, incident_title: str) -> dict[str, Any]:
        """Compare before/after images and return an explicit tri-state result.

        Returns ``{"status": "verified"|"rejected"|"error", "confidence": float, "notes": str}``.

        - ``verified``  — the model evaluated both images and accepted the repair.
        - ``rejected``  — the model evaluated both images and rejected the repair.
        - ``error``     — verification could not complete (missing key, network,
          image fetch, provider error, unparseable response). Never a business
          rejection; callers must not treat this as a failed repair.
        """
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY is not set. Resolution verification unavailable.")
            return {"status": "error", "confidence": 0.0, "notes": "Verification provider not configured"}

        try:
            client = Groq(api_key=api_key, timeout=30.0, max_retries=0)
            # Helper to fetch and encode image safely
            from app.core.security import is_safe_image_url
            def fetch_image(url):
                if not url:
                    raise ValueError("Image URL is empty")
                if not is_safe_image_url(url):
                    raise ValueError("Invalid or unsafe image URL")
                with requests.get(url, timeout=(5, 10), stream=True, allow_redirects=False) as res:
                    if res.status_code != 200:
                        raise ValueError("Image retrieval unsuccessful")
                    ctype = res.headers.get('content-type', '').split(';')[0].lower()
                    if ctype not in {'image/jpeg', 'image/png', 'image/webp', 'image/gif'}:
                        raise ValueError("Unsupported image type")
                    chunks = []
                    size = 0
                    for chunk in res.iter_content(65536):
                        size += len(chunk)
                        if size > 5 * 1024 * 1024:
                            raise ValueError("Image exceeds size limit")
                        chunks.append(chunk)
                    if not size:
                        raise ValueError("Empty image")
                    b64 = base64.b64encode(b''.join(chunks)).decode("utf-8")
                    return f"data:{ctype};base64,{b64}"

            before_b64 = fetch_image(before_url)
            after_b64 = fetch_image(after_url)

            # Sanitize incident title to prevent prompt injection
            safe_title = str(incident_title).replace("\n", " ").replace('"', '\\"').strip()[:100]

            prompt = (
                f'You are an expert infrastructure auditing AI. You are reviewing a resolution report for incident: "{safe_title}". '
                "You are provided with TWO images. The FIRST image is the 'Before' picture showing the initial problem. "
                "The SECOND image is the 'After' picture showing the worker's claimed repair/resolution. "
                "Carefully compare both images. "
                "Determine if the issue shown in the 'Before' picture has been genuinely and adequately resolved in the 'After' picture. "
                "Output your response strictly in JSON format with these exact keys: "
                "'resolution_verified' (boolean), "
                "'confidence' (number between 0.0 and 1.0 representing your certainty), "
                "'ai_reviewer_notes' (string, explaining why you accepted or rejected the resolution proof)."
            )

            completion = client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": before_b64}},
                            {"type": "image_url", "image_url": {"url": after_b64}}
                        ]
                    }
                ],
                temperature=0.1, 
                max_tokens=256,
                response_format={"type": "json_object"}
            )
            
            raw_res = completion.choices[0].message.content.strip()
            parsed = json.loads(raw_res)
            if not isinstance(parsed, dict) or type(parsed.get("resolution_verified")) is not bool:
                raise ValueError("Missing or invalid verification decision")
            verified = parsed["resolution_verified"]
            confidence = parsed.get("confidence")
            if type(confidence) not in (int, float) or not 0 <= confidence <= 1:
                raise ValueError("Invalid verification confidence")
            notes = parsed.get("ai_reviewer_notes")
            if not isinstance(notes, str) or not notes.strip():
                raise ValueError("Missing reviewer notes")
            logger.info(f"Resolution Verification complete: verified={verified}")

            return {
                "status": "verified" if verified else "rejected",
                "confidence": float(parsed.get("confidence", 0.0)),
                "notes": notes,
            }

        except Exception as e:
            # Infrastructure/provider failure is NOT a business rejection.
            logger.error(f"Resolution verification infrastructure failure: {e}")
            return {"status": "error", "confidence": 0.0, "notes": "Verification service temporarily unavailable"}
