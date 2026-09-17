from pydantic import BaseModel, field_validator, ConfigDict
from typing import Optional
from datetime import datetime


class IncidentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    description: str
    category: str
    severity: Optional[str] = "low"
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    address: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return "low"
        v_clean = v.lower().strip().replace(" risk", "")
        if v_clean in ("emergency", "critical"):
            return "critical"
        allowed = {"low", "medium", "high", "critical"}
        if v_clean not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v_clean


class IncidentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    tracking_id: str
    citizen_id: Optional[str] = None
    user_id: Optional[str] = None
    title: str
    description: str
    category: str
    severity: str
    status: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    location_name: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    ai_summary: Optional[str] = None
    assigned_to: Optional[str] = None
    source: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    cluster_id: Optional[str] = None
    is_primary_incident: Optional[bool] = False
    duplicate_count: Optional[int] = 0
    # Enriched fields returned by backend endpoints
    citizen: Optional[dict] = None
    worker: Optional[dict] = None
    department: Optional[str] = None
    ai_processing_status: Optional[str] = None
    ai_vision_analysis: Optional[str] = None
    ai_category: Optional[str] = None
    ai_severity: Optional[str] = None
    ai_department: Optional[str] = None
    ai_confidence_score: Optional[float] = None
    ai_structured_data: Optional[dict] = None
    priority_score: Optional[float] = None


class IncidentListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool
    message: str
    data: list[IncidentResponse]


class IncidentStatusUpdate(BaseModel):
    """Used by both authority (assign worker) and worker (resolve with proof)."""
    model_config = ConfigDict(extra="ignore")

    status: str
    worker_id: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_image_url: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_clean = v.lower().strip().replace("_", "-")
        allowed = {"pending", "assigned", "in-progress", "resolved", "rejected", "closed"}
        if v_clean not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v_clean


class IncidentTriageUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    category: Optional[str] = None
    severity: Optional[str] = None
    department: Optional[str] = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return v
        v_clean = v.lower().strip().replace(" risk", "")
        if v_clean in ("emergency", "critical"):
            return "critical"
        allowed = {"low", "medium", "high", "critical"}
        if v_clean not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v_clean


class IncidentUpdateResponse(BaseModel):
    """Mirrors the incident_updates DB table row."""
    model_config = ConfigDict(extra="ignore")

    id: str
    incident_id: str
    updated_by: str
    status: str
    note: Optional[str] = None
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    created_at: str

