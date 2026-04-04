"""
Defines the final shape expected by the /api/v1/incidents or internal service.
"""

from pydantic import BaseModel
from typing import Optional

class StructuredIncidentPayload(BaseModel):
    title: str
    description: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    imageUrl: Optional[str] = None
    audioUrl: Optional[str] = None
    source: str = "whatsapp"
    phoneNumber: Optional[str] = None
    whatsappMessageId: Optional[str] = None
