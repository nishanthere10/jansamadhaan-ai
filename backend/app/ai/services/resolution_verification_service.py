import logging
import os
import requests
import base64
import json
from groq import Groq
from typing import Dict, Any

logger = logging.getLogger(__name__)

class ResolutionVerificationService:
    """
    Phase 4: Automated Proof-of-Work checking.
    When a field worker marks a task as resolved, this service uses
    Llama-4-Scout (Vision) to compare the "Before" photo with the "After" proof
    to verify authenticity and completion.
    """
    
    @classmethod
    def verify_resolution(cls, before_url: str, after_url: str, incident_title: str) -> Dict[str, Any]:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY is not set. Resolution Verification skipped.")
            return {"resolution_verified": False, "confidence": 0.0, "notes": "API Key missing"}

        client = Groq(api_key=api_key)
        
        try:
            # Helper to fetch and encode image
            def fetch_image(url):
                res = requests.get(url, timeout=10)
                res.raise_for_status()
                ctype = res.headers.get('content-type', 'image/jpeg')
                b64 = base64.b64encode(res.content).decode("utf-8")
                return f"data:{ctype};base64,{b64}"

            before_b64 = fetch_image(before_url)
            after_b64 = fetch_image(after_url)

            prompt = (
                f"You are an expert infrastructure auditing AI. You are reviewing a resolution report for: '{incident_title}'. "
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
            logger.info(f"Resolution Verification complete: Verified={parsed.get('resolution_verified')}")
            
            return {
                "resolution_verified": parsed.get("resolution_verified", False),
                "confidence": parsed.get("confidence", 0.0),
                "notes": parsed.get("ai_reviewer_notes", raw_res)
            }
            
        except Exception as e:
            logger.error(f"Failed to verify resolution via VLM: {e}")
            return {"resolution_verified": False, "confidence": 0.0, "notes": f"Error: {e}"}
