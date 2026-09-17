from supabase import Client
from fastapi import BackgroundTasks
import time
import secrets
import logging
from typing import Optional

logger = logging.getLogger(__name__)

class IncidentService:
    @staticmethod
    def generate_tracking_id() -> str:
        return f"CIV-{int(time.time())}-{secrets.token_hex(2).upper()}"

    @staticmethod
    def create_incident(
        db: Client,
        background_tasks: BackgroundTasks,
        citizen_id: str,
        title: str,
        description: str,
        category: str,
        severity: str = "low",
        location_lat: Optional[float] = None,
        location_lng: Optional[float] = None,
        address: Optional[str] = None,
        image_url: Optional[str] = None,
        audio_url: Optional[str] = None,
        source: str = "app"
    ) -> dict:
        """
        Reusable incident creation logic.
        Can be called via REST API or internal programmatic webhooks.
        """
        from app.ai.tasks import process_incident_ai_background
        
        tracking_id = IncidentService.generate_tracking_id()

        insert_data = {
            "tracking_id": tracking_id,
            "citizen_id": citizen_id,
            "user_id": citizen_id,  # Mirror to user_id (FK to auth.users(id))
            "title": title,
            "description": description,
            "category": category,
            "severity": severity or "low",
            "status": "pending",
            "location_lat": location_lat,
            "location_lng": location_lng,
            "latitude": location_lat,   # Mirror to latitude
            "longitude": location_lng, # Mirror to longitude
            "address": address,
            "location_name": address,  # Mirror to location_name
            "image_url": image_url
        }

        try:
            res = db.table("incidents").insert(insert_data).execute()
            
            # Trigger Phase 2 AI Pipeline Asynchronously
            incident_id = res.data[0]["id"]
            background_tasks.add_task(
                process_incident_ai_background, 
                incident_id, 
                description, 
                audio_url,  # Passed successfully here! 
                image_url,
                location_lat,
                location_lng,
                address
            )

            return {
                "success": True,
                "message": "Incident reported successfully",
                "data": res.data[0],
            }
        except Exception as e:
            logger.exception("Failed to create incident in IncidentService")
            raise Exception(f"Failed to create incident: {str(e)}")
