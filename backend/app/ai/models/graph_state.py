from typing_extensions import TypedDict
from typing import Annotated, List, Optional
import operator

class ComplaintGraphState(TypedDict):
    """
    State object shared across all LangGraph nodes in the AI Pipeline.
    """
    # Incident ID
    incident_id: str

    # Raw Input
    original_text: str
    audio_path: Optional[str]
    image_url: Optional[str]
    address: Optional[str]
    location_lat: Optional[float]
    location_lng: Optional[float]
    
    # Vision & Transcription
    vision_analysis: Optional[str]
    transcript: Optional[str]
    
    # Translation
    detected_language: Optional[str]
    translated_text: Optional[str]
    
    # Classification
    category: Optional[str]
    generated_title: Optional[str]
    generated_summary: Optional[str]
    keywords: Annotated[list[str], operator.add]
    is_spam: Optional[bool]
    spam_score: Optional[float]
    spam_reason: Optional[str]
    
    # Severity
    severity: Optional[str]
    severity_score: Optional[float]
    severity_explanation: Optional[str]
    
    # Routing
    primary_department: Optional[str]
    secondary_departments: Annotated[list[str], operator.add]
    escalation_level: Optional[str]
    
    # Operations
    ai_confidence_score: Optional[float]
    needs_manual_review: bool
    status: str
    error: Optional[str]
