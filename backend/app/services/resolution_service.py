"""Resolution state transitions; provider failures are never repair rejections."""
import logging
import uuid

from fastapi import HTTPException

from app.ai.services.resolution_verification_service import (
    ResolutionVerificationService,
)
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


def submit_resolution(db, incident_id: str, req, user: dict) -> dict:
    result = db.table("incidents").select("*").eq("id", incident_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident = result.data[0]
    if user["role"] == "worker" and incident.get("assigned_to") != user["id"]:
        raise HTTPException(status_code=403, detail="Workers can only resolve their assigned incidents")
    if req.worker_id:
        raise HTTPException(status_code=422, detail="Assign workers separately from resolution")
    if not incident.get("image_url"):
        raise HTTPException(status_code=422, detail="Original image required for resolution comparison")
    previous = incident["status"]
    if previous in {"closed", "resolved", "rejected"}:
        raise HTTPException(status_code=409, detail="Incident is not open for resolution")

    # Only accept proof uploaded through this incident's authenticated upload flow.
    prefix = db.storage.from_("grievance_images").get_public_url(
        f"resolution/{incident_id}/{user['id']}/"
    ).rstrip("/") + "/"
    proof = req.resolution_image_url.strip()
    if not proof.startswith(prefix):
        raise HTTPException(status_code=422, detail="Upload proof for this incident before resolving")
    filename = proof[len(prefix):]
    try:
        stem, ext = filename.rsplit(".", 1)
        if str(uuid.UUID(stem)) != stem or ext not in {"jpg", "png", "webp", "gif"}:
            raise ValueError("Invalid object name")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="Invalid resolution proof object") from exc

    # Persist a pending attempt before calling infrastructure; a process failure
    # leaves evidence for manual review without changing the operational state.
    verification_id = str(uuid.uuid4())
    db.table("resolution_verifications").insert({
        "id": verification_id, "incident_id": incident_id,
        "before_image_url": incident["image_url"], "after_image_url": proof,
        "verification_score": 0.0, "verification_status": "pending",
        "manual_review_required": True,
    }).execute()
    try:
        verification = ResolutionVerificationService.verify_resolution(incident["image_url"], proof, incident["title"])
    except Exception:
        logger.exception("Resolution provider failed for %s", incident_id)
        verification = {"status": "error", "confidence": 0.0}
    outcome = verification.get("status")
    if outcome not in {"verified", "rejected"}:
        outcome = "error"
    messages = {
        "verified": "Resolution verified. The incident is resolved.",
        "rejected": "Resolution proof was rejected. Rework and manual review are required.",
        "error": "Verification could not complete. Manual review is required; the repair was not rejected.",
    }
    status = {"verified": "resolved", "rejected": "in-progress", "error": previous}[outcome]
    finalized = db.rpc("finalize_resolution", {
        "p_incident_id": incident_id,
        "p_verification_id": verification_id,
        "p_actor_id": user["id"],
        "p_previous_status": previous,
        "p_assigned_to": incident.get("assigned_to"),
        "p_outcome": outcome,
        "p_confidence": verification.get("confidence", 0.0),
        "p_note": messages[outcome],
    }).execute()
    if not isinstance(finalized.data, dict) or finalized.data.get("applied") is not True:
        raise HTTPException(status_code=409, detail="Incident changed during verification; reload before retrying")
    for recipient in {incident.get("citizen_id"), incident.get("assigned_to"), user["id"]} - {None}:
        NotificationService.create_notification(db, recipient, "Resolution verification", messages[outcome])
    return {"success": True, "message": messages[outcome], "data": {
        "status": status, "verification_status": outcome,
        "manual_review_required": outcome != "verified", "verification_id": verification_id,
    }}
