"""
Provides helper for parsing Twilio's x-www-form-urlencoded webhook payload.
FastAPI handles forms using Form() injection. This file serves to clearly
define the expected fields.
"""

from fastapi import Form
from typing import Optional

class TwilioPayload:
    """Dependency injection class for Twilio webhook."""
    def __init__(
        self,
        From: str = Form(...),
        Body: str = Form(""),
        NumMedia: int = Form(0),
        Latitude: Optional[float] = Form(None),
        Longitude: Optional[float] = Form(None),
        MessageSid: str = Form(...),
    ):
        self.From = From
        self.Body = Body
        self.NumMedia = NumMedia
        self.Latitude = Latitude
        self.Longitude = Longitude
        self.MessageSid = MessageSid
