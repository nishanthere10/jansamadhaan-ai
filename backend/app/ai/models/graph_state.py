import operator
from typing import Annotated

from typing_extensions import TypedDict


class ComplaintGraphState(TypedDict):
    """
    State object shared across all LangGraph nodes in the AI Pipeline.
    """
    # Incident ID
    incident_id: str

    # Raw Input
    original_text: str
    audio_path: str | None
    image_url: str | None
    address: str | None
    location_lat: float | None
    location_lng: float | None
    
    # Vision & Transcription
    vision_analysis: str | None
    transcript: str | None
    
    # Translation
    detected_language: str | None
    translated_text: str | None
    
    # Classification
    category: str | None
    generated_title: str | None
    generated_summary: str | None
    keywords: Annotated[list[str], operator.add]
    is_spam: bool | None
    spam_score: float | None
    spam_reason: str | None
    
    # Severity
    severity: str | None
    severity_score: float | None
    severity_explanation: str | None
    
    # Routing
    primary_department: str | None
    secondary_departments: Annotated[list[str], operator.add]
    escalation_level: str | None
    
    # Operations
    ai_confidence_score: float | None
    needs_manual_review: bool
    status: str
    error: str | None
