from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status as http_status
from app.schemas.incident import IncidentCreateRequest, IncidentStatusUpdate, IncidentTriageUpdate
from app.core.database import get_supabase
from app.core.security import get_current_user
from supabase import Client
from datetime import datetime, timezone
import uuid
import time
import secrets
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService

# ── Create Incident ───────────────────────────────────────────────────────────

@router.post("", status_code=http_status.HTTP_201_CREATED)
def create_incident(
    req: IncidentCreateRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    db: Client = get_supabase()
    
    try:
        res = IncidentService.create_incident(
            db=db,
            background_tasks=background_tasks,
            citizen_id=user["id"],
            title=req.title,
            description=req.description,
            category=req.category,
            severity=req.severity,
            location_lat=req.location_lat,
            location_lng=req.location_lng,
            address=req.address,
            image_url=req.image_url,
            source="app"
        )
        return res
    except Exception as e:
        logger.exception("Failed to create incident")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create incident: {str(e)}",
        )


# ── List Incidents (role-filtered) ────────────────────────────────────────────

@router.get("")
def list_incidents(user: dict = Depends(get_current_user)):
    db: Client = get_supabase()
    try:
        # Avoid relying on PostgREST foreign key joins on incidents->users 
        # as it crashes when the FK constraint is missing from the database schema.
        # Fetch incidents directly and map citizen data manually.
        if user["role"] == "citizen":
            res = (
                db.table("incidents")
                .select("*")
                .eq("citizen_id", user["id"])
                .order("created_at", desc=True)
                .execute()
            )
        elif user["role"] == "worker":
            res = (
                db.table("incidents")
                .select("*")
                .eq("assigned_to", user["id"])
                .order("created_at", desc=True)
                .execute()
            )
        else:
            # authority — see all
            res = (
                db.table("incidents")
                .select("*")
                .order("created_at", desc=True)
                .execute()
            )

        incidents = res.data or []

        if incidents:
            # Extract unique citizen IDs
            citizen_ids = list({inc["citizen_id"] for inc in incidents if inc.get("citizen_id")})
            users_map = {}
            if citizen_ids:
                users_res = db.table("users").select("*").in_("id", citizen_ids).execute()
                for u in (users_res.data or []):
                    users_map[u["id"]] = u

            # Map the citizen info into each incident
            for inc in incidents:
                c_id = inc.get("citizen_id")
                if c_id and c_id in users_map:
                    inc["citizen"] = users_map[c_id]
                else:
                    inc["citizen"] = None

        return {
            "success": True,
            "message": "Incidents fetched successfully",
            "data": incidents,
        }
    except Exception as e:
        logger.exception("Failed to list incidents")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch incidents: {str(e)}",
        )


# ── Upload Image ──────────────────────────────────────────────────────────────

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/upload")
def upload_image(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    db: Client = get_supabase()

    # ── Validate file type ──
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=http_status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WEBP, GIF.",
        )

    # ── Read file in chunks to prevent OOM from oversized uploads ──
    try:
        chunks = []
        total_read = 0
        CHUNK_SIZE = 64 * 1024  # 64 KB
        while True:
            chunk = file.file.read(CHUNK_SIZE)
            if not chunk:
                break
            total_read += len(chunk)
            if total_read > MAX_FILE_BYTES:
                raise HTTPException(
                    status_code=http_status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File too large. Maximum size is 5 MB.",
                )
            chunks.append(chunk)
        file_bytes = b"".join(chunks)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}",
        )

    ext = (file.filename or "upload").rsplit(".", 1)[-1].lower()
    file_name = f"{uuid.uuid4()}.{ext}"

    try:
        db.storage.from_("grievance_images").upload(
            file_name, file_bytes, {"content-type": file.content_type}
        )
        public_url: str = db.storage.from_("grievance_images").get_public_url(file_name)

        return {
            "success": True,
            "message": "Image uploaded successfully",
            "data": {"image_url": public_url},
        }
    except Exception as e:
        logger.exception("Image upload to Supabase storage failed")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Storage upload failed: {str(e)}",
        )


# ── Update Incident Status ────────────────────────────────────────────────────

@router.put("/{incident_id}/status")
def update_incident_status(
    incident_id: str,
    req: IncidentStatusUpdate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    db: Client = get_supabase()
    role = user["role"]

    if role not in ("authority", "worker"):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only authority or worker accounts can update incident status.",
        )

    update_data: dict = {"status": req.status, "updated_at": datetime.now(timezone.utc).isoformat()}

    if role == "authority" and req.worker_id:
        if req.worker_id.startswith("mock-"):
            real_workers = db.table("users").select("id").eq("role", "worker").limit(1).execute()
            if real_workers.data:
                update_data["assigned_to"] = real_workers.data[0]["id"]
        else:
            update_data["assigned_to"] = req.worker_id

    try:
        db.table("incidents").update(update_data).eq("id", incident_id).execute()

        update_log = {
            "incident_id": incident_id,
            "updated_by": user["id"],
            "status": req.status,
            "note": req.resolution_notes,
            "after_image_url": req.resolution_image_url,
        }
        db.table("incident_updates").insert(update_log).execute()

        # Fetch incident to know who to notify
        inc_res = db.table("incidents").select("title, citizen_id, tracking_id, image_url").eq("id", incident_id).execute()
        if inc_res.data:
            incident = inc_res.data[0]
            
            # Notify citizen
            NotificationService.create_notification(
                db, 
                incident["citizen_id"], 
                f"Incident Status Updated", 
                f"Your incident '{incident['title']}' is now {req.status}."
            )
            
            # Determine actual worker to notify
            notify_worker_id = req.worker_id
            if notify_worker_id and notify_worker_id.startswith("mock-"):
                if "assigned_to" in update_data:
                    notify_worker_id = update_data["assigned_to"]
                else:
                    notify_worker_id = None
                    
            # Notify worker if newly assigned and it's a real worker
            if role == "authority" and notify_worker_id:
                NotificationService.create_notification(
                    db,
                    notify_worker_id,
                    f"New Assignment",
                    f"You have been assigned to incident '{incident['title']}' ({incident['tracking_id']})."
                )
                
            # If resolved with an image, trigger resolution verification
            if req.status == "resolved" and req.resolution_image_url and incident.get("image_url"):
                from app.ai.services.resolution_verification_service import ResolutionVerificationService
                def background_verify():
                    try:
                        verification = ResolutionVerificationService.verify_resolution(
                            before_url=incident["image_url"],
                            after_url=req.resolution_image_url,
                            incident_title=incident["title"]
                        )
                        # We can store the review notes in another update or DB field
                        db.table("incident_updates").insert({
                            "incident_id": incident_id,
                            "updated_by": "00000000-0000-0000-0000-000000000000", # System user
                            "status": "verified" if verification["resolution_verified"] else "rejected_by_ai",
                            "note": f"AI Verification: {verification['notes']} (Confidence: {verification['confidence']})"
                        }).execute()
                    except Exception as e:
                        logger.error(f"Background verification failed: {e}")
                
                background_tasks.add_task(background_verify)

        return {
            "success": True,
            "message": "Incident updated successfully",
            "data": update_data,
        }
    except Exception as e:
        logger.exception("Failed to update incident status")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update incident: {str(e)}",
        )

# ── Update Incident Triage ───────────────────────────────────────────────────

@router.put("/{incident_id}/triage")
def update_incident_triage(
    incident_id: str,
    req: IncidentTriageUpdate,
    user: dict = Depends(get_current_user),
):
    db: Client = get_supabase()
    if user["role"] != "authority":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only authority accounts can accept AI triage.",
        )

    try:
        update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
        if req.category is not None:
            update_data["category"] = req.category
        if req.severity is not None:
            update_data["severity"] = req.severity
        if req.department is not None:
            update_data["department"] = req.department
            
        db.table("incidents").update(update_data).eq("id", incident_id).execute()
        return {
            "success": True,
            "message": "AI triage updated successfully",
            "data": update_data,
        }
    except Exception as e:
        import traceback
        err_msg = str(e)
        if hasattr(e, "response") and e.response is not None:
            err_msg += f" Response: {e.response.text}"
        elif hasattr(e, "details"):
            err_msg += f" Details: {getattr(e, 'details')}"
        logger.error(f"Failed to update incident triage: {err_msg}\\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update triage: {err_msg}",
        )

# ── Get Incident Updates ──────────────────────────────────────────────────────

@router.get("/{incident_id}/updates")
def get_incident_updates(
    incident_id: str,
    user: dict = Depends(get_current_user),
):
    db: Client = get_supabase()
    try:
        # Fetch the updates for this incident, ordered by creation time
        # We also might want to join the 'updated_by' user if possible, but for now we'll just return raw updates
        res = (
            db.table("incident_updates")
            .select("*")
            .eq("incident_id", incident_id)
            .order("created_at", desc=False)
            .execute()
        )
        return {
            "success": True,
            "message": "Incident updates fetched successfully",
            "data": res.data,
        }
    except Exception as e:
        logger.exception("Failed to fetch incident updates")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch updates: {str(e)}",
        )


# ── Re-trigger AI Processing ─────────────────────────────────────────────────

@router.post("/{incident_id}/reprocess")
def reprocess_incident_ai(
    incident_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    """Re-trigger AI pipeline processing for a specific incident."""
    from app.ai.tasks import process_incident_ai_background
    db: Client = get_supabase()

    try:
        # Fetch the incident
        res = db.table("incidents").select("*").eq("id", incident_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Incident not found")

        incident = res.data

        # Reset AI status
        db.table("incidents").update({"ai_processing_status": "processing"}).eq("id", incident_id).execute()

        # Re-trigger pipeline
        background_tasks.add_task(
            process_incident_ai_background,
            incident_id,
            incident.get("description", ""),
            None,
            incident.get("image_url"),
            incident.get("location_lat"),
            incident.get("location_lng"),
            incident.get("address")
        )

        return {
            "success": True,
            "message": "AI processing re-triggered successfully",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to re-trigger AI processing")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to re-trigger AI: {str(e)}",
        )
