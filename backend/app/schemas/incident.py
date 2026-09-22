
from pydantic import BaseModel, ConfigDict, field_validator, model_validator


class IncidentCreateRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    description: str
    category: str
    severity: str | None = "low"
    location_lat: float | None = None
    location_lng: float | None = None
    address: str | None = None
    image_url: str | None = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str | None) -> str | None:
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
    citizen_id: str | None = None
    user_id: str | None = None
    title: str
    description: str
    category: str
    severity: str
    status: str
    location_lat: float | None = None
    location_lng: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None
    location_name: str | None = None
    image_url: str | None = None
    audio_url: str | None = None
    ai_summary: str | None = None
    assigned_to: str | None = None
    source: str | None = None
    created_at: str
    updated_at: str | None = None
    cluster_id: str | None = None
    is_primary_incident: bool | None = False
    duplicate_count: int | None = 0
    public_tracking_token: str | None = None
    # Enriched fields returned by backend endpoints
    citizen: dict | None = None
    worker: dict | None = None
    department: str | None = None
    ai_processing_status: str | None = None
    ai_vision_analysis: str | None = None
    ai_category: str | None = None
    ai_severity: str | None = None
    ai_department: str | None = None
    ai_confidence_score: float | None = None
    ai_structured_data: dict | None = None


class IncidentListResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool
    message: str
    data: list[IncidentResponse]


class IncidentStatusUpdate(BaseModel):
    """Used by both authority (assign worker) and worker (resolve with proof)."""
    model_config = ConfigDict(extra="ignore")

    status: str
    worker_id: str | None = None
    resolution_notes: str | None = None
    resolution_image_url: str | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_clean = v.lower().strip().replace("_", "-")
        allowed = {"pending", "assigned", "in-progress", "resolved", "rejected", "closed"}
        if v_clean not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v_clean

    @model_validator(mode="after")
    def require_resolution_proof(self):
        """Resolution proof is mandatory for EVERY role.

        A worker or authority may not transition an incident to ``resolved``
        without a resolution image — the AI verification block otherwise never
        runs and proof-of-resolution can be silently bypassed.
        """
        if self.status == "resolved" and not (self.resolution_image_url or "").strip():
            raise ValueError("resolution_image_url is required when resolving an incident")
        return self


class IncidentTriageUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    category: str | None = None
    severity: str | None = None
    department: str | None = None

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str | None) -> str | None:
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
    note: str | None = None
    before_image_url: str | None = None
    after_image_url: str | None = None
    created_at: str


class IncidentFeedbackRequest(BaseModel):
    """Citizen feedback or dispute on a resolved incident."""
    model_config = ConfigDict(extra="ignore")

    rating: int = 5
    comment: str | None = None
    is_disputed: bool = False

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("rating must be between 1 and 5")
        return v


class PublicTrackingResponse(BaseModel):
    """Sanitized public tracking response. PII-free, explicit allow-list.

    Deliberately thin: this is served WITHOUT authentication, so every field
    here must be safe for an anonymous visitor holding the tracking link.
    Removed as unimplemented/duplicated (nothing consumed them):
    ``ward`` (no ward model exists), ``address`` (duplicate of
    ``location_label``), and the ``*_eligible`` booleans (feedback requires an
    authenticated citizen session, which this anonymous route cannot provide).
    """
    model_config = ConfigDict(extra="ignore")

    tracking_id: str
    title: str
    description: str | None = None
    category: str
    severity: str
    status: str
    department: str | None = None
    location_label: str | None = None
    source: str | None = None
    created_at: str
    # SLA is computed server-side by app/services/sla_service.py — the
    # frontend twin of this table lives in frontend/lib/sla.ts.
    sla_state: str | None = None
    sla_due_at: str | None = None
    sla_hours: int | None = None
    citizen_visible_timeline: list[dict] = []
    image_url: str | None = None
    resolution_image: str | None = None
    verification_status: str | None = None
    verification_score: float | None = None

