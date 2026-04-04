import logging
from typing import Optional
from app.whatsapp_ai.schemas.whatsapp_message_schema import WhatsAppMessageSchema
from app.whatsapp_ai.schemas.structured_incident_schema import StructuredIncidentPayload
from app.whatsapp_ai.utils.whatsapp_constants import WHATSAPP_UNKNOWN_CATEGORY, WHATSAPP_UNKNOWN_TITLE, WHATSAPP_SOURCE

logger = logging.getLogger(__name__)

class WhatsAppIncidentMapper:
    @staticmethod
    def map_to_incident(
        message: WhatsAppMessageSchema, 
        uploaded_image_url: Optional[str],
        uploaded_audio_url: Optional[str]
    ) -> StructuredIncidentPayload:
        """
        Maps a parsed WhatsApp message + resolved media URLs to the standard Incident Payload.
        Defaults missing title and category.
        """
        desc = message.text
        
        if not desc and uploaded_audio_url:
            desc = "User submitted an audio complaint. Transcription pending."
        elif not desc and uploaded_image_url:
            desc = "User submitted an image complaint without description."
        elif not desc:
            desc = "No details provided."

        return StructuredIncidentPayload(
            title=WHATSAPP_UNKNOWN_TITLE, # Explicitly default for AI pipeline to override later
            description=desc,
            category=WHATSAPP_UNKNOWN_CATEGORY, 
            latitude=message.latitude,
            longitude=message.longitude,
            imageUrl=uploaded_image_url,
            audioUrl=uploaded_audio_url,
            source=WHATSAPP_SOURCE,
            phoneNumber=message.phone_number,
            whatsappMessageId=message.message_sid
        )
