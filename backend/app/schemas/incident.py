from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime


class IncidentCreateRequest(BaseModel):
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
        allowed = {"low", "medium", "high", "critical"}
        if v and v not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v


class IncidentResponse(BaseModel):
    id: str
    tracking_id: str
    citizen_id: Optional[str] = None
    title: str
    description: str
    category: str
    severity: str
    status: str
    location_lat: Optional[float] = None
    location_lng: Optional[float] = None
    address: Optional[str] = None
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


class IncidentListResponse(BaseModel):
    success: bool
    message: str
    data: list[IncidentResponse]


class IncidentStatusUpdate(BaseModel):
    """Used by both authority (assign worker) and worker (resolve with proof)."""
    status: str
    worker_id: Optional[str] = None
    resolution_notes: Optional[str] = None
    resolution_image_url: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"pending", "assigned", "in-progress", "resolved", "rejected"}
        if v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class IncidentTriageUpdate(BaseModel):
    category: Optional[str] = None
    severity: Optional[str] = None
    department: Optional[str] = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: Optional[str]) -> Optional[str]:
        allowed = {"low", "medium", "high", "critical"}
        if v and v not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v


class IncidentUpdateResponse(BaseModel):
    """Mirrors the incident_updates DB table row."""
    id: str
    incident_id: str
    updated_by: str
    status: str
    note: Optional[str] = None
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    created_at: str
