import logging
import os
from groq import Groq
from app.ai.models.graph_state import ComplaintGraphState

logger = logging.getLogger(__name__)

import requests
import base64

class VisionAnalysisService:
    def __init__(self):
        self.api_key = os.environ.get("GROQ_API_KEY")
        if not self.api_key:
            logger.warning("GROQ_API_KEY is not set. VisionAnalysisService may fail.")
        else:
            self.client = Groq(api_key=self.api_key)
            
        # Using Llama 4 Scout for multi-modal analysis
        self.model_name = "meta-llama/llama-4-scout-17b-16e-instruct"

    def process(self, state: ComplaintGraphState) -> dict:
        """
        Analyzes the uploaded image (if any) and extracts factual visual evidence.
        Downloads the image locally first and converts it to base64 to avoid URL 403 access issues.
        """
        image_url = state.get("image_url")
        
        if not image_url:
            logger.info("No image_url provided in state. Skipping Vision Analysis.")
            return {"vision_analysis": None}

        if not hasattr(self, 'client'):
            logger.error("Vision client not initialized (missing API key).")
            return {"vision_analysis": "Visual processing delayed or skipped (missing configuration)."}

        logger.info(f"Starting Vision Analysis for image: {image_url}")
        
        try:
            if image_url.startswith("data:image/"):
                base64_url = image_url
            else:
                # 1. Validate image URL to prevent SSRF
                from app.core.security import is_safe_image_url
                if not is_safe_image_url(image_url):
                    logger.warning(f"Rejected potentially unsafe image URL: {image_url}")
                    return {"vision_analysis": "Image URL validation failed."}

                # 2. Fetch image directly to bypass 403 restriction from Groq crawler
                response = requests.get(image_url, timeout=10)
                response.raise_for_status()
                content_type = response.headers.get('content-type', 'image/jpeg')
                base64_image = base64.b64encode(response.content).decode("utf-8")
                base64_url = f"data:{content_type};base64,{base64_image}"

            lat = state.get("location_lat")
            lng = state.get("location_lng")
            address_context = state.get("address", "Unknown Location")
            
            geo_info = ""
            if lat and lng:
                geo_info = f" The incident occurred at Latitude: {lat}, Longitude: {lng} ({address_context})."

            # Using Llama-4-Scout Vision
            current_model = "meta-llama/llama-4-scout-17b-16e-instruct"

            prompt = (
                "You are an expert civic infrastructure inspector. Analyze the following uploaded photo. "
                "FIRST, determine if the image is a valid civic or infrastructure issue (e.g. pothole, broken pipe, garbage). "
                "If it is an out-of-context or irrelevant image (e.g., a flower, a person, a selfie, an animal in nature), "
                "you MUST flag it as irrelevant by setting 'is_relevant' to false. "
                "Describe exactly what you see in the photo with high precision. If it is irrelevant, state exactly what is inside the image (e.g., 'An image of a red rose') and clearly state it is an invalid/irrelevant image for civic problems. "
                "Focus strictly on objective visual evidence. "
                f"Take the geographic context into account if relevant:{geo_info} "
                "You MUST output your response in strict JSON format. "
                "The JSON must have the following keys: "
                "'is_relevant' (boolean), "
                "'has_visible_damage' (boolean), "
                "'safety_hazard' (boolean), "
                "'hazard_description' (string, or 'None' if safe/irrelevant), "
                "'estimated_size' (string, e.g. 'Small', 'Medium', 'Large', or 'N/A'), "
                "'objects_detected' (list of strings, max 5 objects), "
                "'vision_summary' (string, a concise objective summary of what is exactly in the photo). "
                "Do not make up information. ONLY output the JSON object."
            )

            completion = self.client.chat.completions.create(
                model=current_model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": base64_url
                                }
                            }
                        ]
                    }
                ],
                temperature=0.1, 
                max_tokens=512,
                response_format={"type": "json_object"}
            )

            import json
            raw_response = completion.choices[0].message.content.strip()
            logger.info(f"Vision Analysis raw completed: {raw_response[:100]}...")
            
            try:
                parsed_json = json.loads(raw_response)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON from vision model: {e}")
                parsed_json = {
                    "is_relevant": False,
                    "has_visible_damage": False,
                    "safety_hazard": False,
                    "hazard_description": "Failed to parse hazard",
                    "estimated_size": "Unknown",
                    "objects_detected": [],
                    "vision_summary": raw_response
                }
            
            return {
                "vision_analysis": parsed_json.get("vision_summary", raw_response),
                "structured_visionData": parsed_json
            }

        except Exception as e:
            logger.error(f"Vision Analysis failed: {str(e)}")
            return {"vision_analysis": f"Vision analysis failed: {str(e)}", "structured_visionData": None}
