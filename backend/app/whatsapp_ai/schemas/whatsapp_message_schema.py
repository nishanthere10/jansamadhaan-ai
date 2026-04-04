"""
Defines the shape of a parsed Twilio message before it hits business logic.
This object normalizes the unpredictable Twilio fields.
"""

from pydantic import BaseModel
from typing import List, Optional

class WhatsAppMessageSchema(BaseModel):
    phone_number: str
    text: str
    image_urls: List[str] = []
    audio_urls: List[str] = []
    video_urls: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    message_sid: str
