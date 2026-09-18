import logging
import secrets
import time

from fastapi import BackgroundTasks
from supabase import Client

from app.services.notification_service import NotificationService

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
        location_lat: float | None = None,
        location_lng: float | None = None,
        address: str | None = None,
        image_url: str | None = None,
        audio_url: str | None = None,
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

            # One durable receipt per created complaint, carrying the tracking
            # ID the citizen needs later. Guarded so no future notification
            # change can turn a created incident into a reported failure.
            try:
                NotificationService.create_notification(
                    db,
                    citizen_id,
                    "Complaint Received",
                    f"Your complaint has been registered. Tracking ID: {tracking_id}.",
                )
            except Exception:
                logger.warning("Receipt notification failed for %s", tracking_id)

            return {
                "success": True,
                "message": "Incident reported successfully",
                "data": res.data[0],
            }
        except Exception as e:
            logger.exception("Failed to create incident in IncidentService")
            raise Exception(f"Failed to create incident: {str(e)}") from e
