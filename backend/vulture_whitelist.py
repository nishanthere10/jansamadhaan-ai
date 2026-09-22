"""Vulture whitelist — names that are dynamically consumed or deliberately kept.

Run:  vulture app vulture_whitelist.py --min-confidence 60
Every entry below must be justified here or in DEAD_CODE_REGISTER.md.
A bare-name entry marks the symbol as "used" for vulture only.
"""

# ── FastAPI route handlers (registered by decorators at import time) ──────────
signup
aadhar_login
login
logout
me
get_workers
list_incidents
get_incident_by_id
upload_image
update_incident_status
update_incident_triage
get_incident_updates
reprocess_incident_ai
list_notifications
mark_notification_read
create_project
list_projects
get_project
health_check
handle_whatsapp_webhook
test_translate
test_classify
test_vision_analyze
reverse_geocode
get_public_tracking_info
submit_incident_feedback
create_project
list_projects
get_project
update_project
delete_project

# ── Framework-called names ─────────────────────────────────────────────────────
dispatch          # FastAPI/Starlette middleware entrypoint
model_config      # Pydantic v2 configuration attribute
clean_supabase_url   # Pydantic field_validator (referenced by field name)
strip_whitespace     # Pydantic field_validator (referenced by field name)
clean_frontend_url   # Pydantic field_validator (referenced by field name)
clean_name           # Pydantic field_validator
clean_phone          # Pydantic field_validator
validate_severity    # Pydantic field_validator
validate_status      # Pydantic field_validator
validate_rating      # Pydantic field_validator
require_resolution_proof  # Pydantic model_validator, exercised by resolution tests

# ── Settings fields (env-driven, may be consumed by deployment config) ────────
SUPABASE_ANON_KEY
SUPABASE_JWT_SECRET
GROQ_API_KEY
# GEMINI_MODEL is declared in Settings and stripped by the shared whitespace
# validator. The vision service currently resolves its model from
# DEFAULT_GEMINI_MODEL / MODEL_ALIASES, so this setting is inert until that is
# unified. Registered rather than removed so deployment config stays valid.
GEMINI_MODEL

# ── Pydantic response/serializer fields (API contract, not local variables) ──
success
location_name
ai_summary
assigned_to
source
created_at
is_primary_incident
citizen
worker
ai_processing_status
ai_vision_analysis
ai_category
ai_severity
ai_department
ai_confidence_score
ai_structured_data
updated_by
note
before_image_url
after_image_url
imageUrl
audioUrl
phoneNumber
whatsappMessageId
has_visible_damage
safety_hazard
hazard_description
estimated_size
objects_detected
vision_summary
transcript
needs_manual_review
# PublicTrackingResponse contract fields (built from computed dicts, so vulture
# sees no local reference). Consumed by the public tracker UI.
location_label
sla_state
sla_due_at
sla_hours
citizen_visible_timeline
resolution_image
verification_status
verification_score

# ── Used only from tests (vulture scans app/ separately from tests/) ──────────
TrustScoringService
reset_supabase_client
WhatsAppSessionManager

# ── API contracts (complete response models, ready for response_model=) ───────
SignupResponseData
LoginResponseData
BaseResponse
IncidentListResponse
IncidentUpdateResponse
# VisionService exposes the active model id on the instance for diagnostics.
model_name

# ── Deliberate KEEP + REGISTER items — see DEAD_CODE_REGISTER.md ──────────────
TranscriptionResponse
VisionAnalysisResponse
TwilioPayload
GEO_RADIUS_METERS
get_session_data
# Designed error subclass of GeminiVisionError, kept as part of the service's
# public error taxonomy (not raised internally).
GeminiResponseParsingError
WhatsAppConfirmationService
send_confirmation
WhatsAppIncidentMapper
map_to_incident
# Function parameter kept for API symmetry with WhatsApp intake (callers pass
# a source; the web path doesn't store it separately).
source
