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

# ── Framework-called names ─────────────────────────────────────────────────────
dispatch          # FastAPI/Starlette middleware entrypoint
model_config      # Pydantic v2 configuration attribute
clean_supabase_url   # Pydantic field_validator (referenced by field name)
strip_whitespace     # Pydantic field_validator (referenced by field name)
validate_severity    # Pydantic field_validator
validate_status      # Pydantic field_validator
require_resolution_proof  # Pydantic model_validator, exercised by resolution tests

# ── Settings fields (env-driven, may be consumed by deployment config) ────────
SUPABASE_ANON_KEY
SUPABASE_JWT_SECRET
GROQ_API_KEY

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
WhatsAppConfirmationService
send_confirmation
WhatsAppIncidentMapper
map_to_incident
