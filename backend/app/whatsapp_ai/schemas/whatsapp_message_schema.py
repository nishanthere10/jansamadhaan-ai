"""
Defines the shape of a parsed Twilio message before it hits business logic.
This object normalizes the unpredictable Twilio fields.
"""


from pydantic import BaseModel


class WhatsAppMessageSchema(BaseModel):
    phone_number: str
    text: str
    image_urls: list[str] = []
    audio_urls: list[str] = []
    video_urls: list[str] = []
    latitude: float | None = None
    longitude: float | None = None
    message_sid: str
