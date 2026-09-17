"""
Defines the final shape expected by the /api/v1/incidents or internal service.
"""


from pydantic import BaseModel


class StructuredIncidentPayload(BaseModel):
    title: str
    description: str
    category: str
    latitude: float | None = None
    longitude: float | None = None
    imageUrl: str | None = None
    audioUrl: str | None = None
    source: str = "whatsapp"
    phoneNumber: str | None = None
    whatsappMessageId: str | None = None
