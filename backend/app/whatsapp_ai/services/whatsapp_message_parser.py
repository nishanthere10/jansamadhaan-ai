import logging
from typing import Optional
from fastapi import Request
from app.whatsapp_ai.schemas.whatsapp_message_schema import WhatsAppMessageSchema
from app.whatsapp_ai.utils.whatsapp_constants import SUPPORTED_MEDIA_TYPES

logger = logging.getLogger(__name__)

class WhatsAppMessageParser:
    @staticmethod
    async def parse_webhook(request: Request) -> WhatsAppMessageSchema:
        """
        Extracts complex form data from Twilio including N media attachments.
        """
        form = await request.form()
        
        phone_number = form.get("From", "")
        if phone_number.startswith("whatsapp:"):
            phone_number = phone_number.replace("whatsapp:", "")
            
        text = form.get("Body", "").strip()
        num_media = int(form.get("NumMedia", 0))
        message_sid = form.get("MessageSid", "")
        
        latitude = None
        longitude = None
        
        if form.get("Latitude") and form.get("Longitude"):
            try:
                latitude = float(form.get("Latitude"))
                longitude = float(form.get("Longitude"))
            except ValueError:
                logger.warning(f"Failed to parse location coordinates for {message_sid}")

        image_urls = []
        audio_urls = []
        video_urls = []
        
        # Twilio sends MediaUrl0, MediaContentType0 ... MediaUrlN
        for i in range(num_media):
            url_key = f"MediaUrl{i}"
            type_key = f"MediaContentType{i}"
            
            m_url = form.get(url_key)
            m_type = form.get(type_key)
            
            if m_url and m_type:
                media_category = SUPPORTED_MEDIA_TYPES.get(m_type)
                if media_category == "image":
                    image_urls.append(m_url)
                elif media_category == "audio":
                    audio_urls.append(m_url)
                elif media_category == "video":
                    video_urls.append(m_url)
                    
        return WhatsAppMessageSchema(
            phone_number=phone_number,
            text=text,
            image_urls=image_urls,
            audio_urls=audio_urls,
            video_urls=video_urls,
            latitude=latitude,
            longitude=longitude,
            message_sid=message_sid
        )
