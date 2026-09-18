import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from fastapi import status as http_status
from supabase import Client

from app.core.config import settings
from app.core.database import get_supabase
from app.core.security import get_current_user
from app.schemas.incident import (
    IncidentCreateRequest,
    IncidentStatusUpdate,
    IncidentTriageUpdate,
)
from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService
from app.services.resolution_service import submit_resolution

logger = logging.getLogger(__name__)
router = APIRouter()


# â”€â”€ Create Incident â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        ) from e


# â”€â”€ List Incidents (role-filtered) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
            # authority â€” see all
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
        ) from e


# â”€â”€ Get Single Incident â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/{incident_id}")
def get_incident_by_id(
    incident_id: str,
    user: dict = Depends(get_current_user),
):
    db: Client = get_supabase()
    try:
        res = db.table("incidents").select("*").eq("id", incident_id).execute()
        if not res.data:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Incident not found")

        incident = res.data[0]

        # Security check: citizens can only view their own incidents
        if user["role"] == "citizen" and incident.get("citizen_id") != user["id"]:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this incident"
            )

        # Security check: workers can only view their assigned incidents.
        # Unassigned incidents are authority-only (fail closed).
        if user["role"] == "worker" and incident.get("assigned_to") != user["id"]:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this incident"
            )

        # Attach citizen details
        c_id = incident.get("citizen_id")
        if c_id:
            users_res = db.table("users").select("id, full_name, email, phone").eq("id", c_id).execute()
            incident["citizen"] = users_res.data[0] if users_res.data else None
        else:
            incident["citizen"] = None

        # Attach assigned worker details
        w_id = incident.get("assigned_to")
        if w_id:
            worker_res = db.table("users").select("id, full_name, email, department").eq("id", w_id).execute()
            incident["worker"] = worker_res.data[0] if worker_res.data else None
        else:
            incident["worker"] = None

        return {
            "success": True,
            "message": "Incident fetched successfully",
            "data": incident,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to fetch incident {incident_id}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch incident: {str(e)}",
        ) from e


# â”€â”€ Upload Image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_BYTES = 5 * 1024 * 1024  # 5 MB


@router.post("/upload")
def upload_image(
    incident_id: str | None = None,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    db: Client = get_supabase()
    if incident_id:
        try:
            incident_id = str(uuid.UUID(incident_id))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Invalid incident ID") from exc
        incident = db.table("incidents").select("assigned_to").eq("id", incident_id).execute()
        if not incident.data:
            raise HTTPException(status_code=404, detail="Incident not found")
        if user["role"] not in {"worker", "authority"} or (
            user["role"] == "worker" and incident.data[0].get("assigned_to") != user["id"]
        ):
            raise HTTPException(status_code=403, detail="Not authorized to upload resolution proof")

    # â”€â”€ Validate file type â”€â”€
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=http_status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WEBP, GIF.",
        )

    # â”€â”€ Read file in chunks to prevent OOM from oversized uploads â”€â”€
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
        ) from e

    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}[file.content_type]
    file_name = f"{uuid.uuid4()}.{ext}"
    if incident_id:
        file_name = f"resolution/{incident_id}/{user['id']}/{file_name}"

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
        ) from e


# â”€â”€ Update Incident Status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _compensate_audit_row(db: Client, audit_id: str | None, incident_id: str) -> None:
    """Best-effort removal of an audit row whose state change did not apply.

    Sequential PostgREST writes are not transactional, so a failed state change is
    compensated instead of leaving the timeline claiming a transition that never
    landed. The residual (a crash between the two writes) is tracked in
    remaining.md; true atomicity requires an RPC migration.
    """
    if not audit_id:
        logger.error("No audit row id captured for %s; timeline may be stale", incident_id)
        return
    try:
        db.table("incident_updates").delete().eq("id", audit_id).execute()
    except Exception:
        logger.exception("Failed to remove orphaned audit row %s for %s", audit_id, incident_id)


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

    if req.status == "resolved":
        try:
            return submit_resolution(db, incident_id, req, user)
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("Resolution persistence failed for %s", incident_id)
            raise HTTPException(status_code=503, detail="Unable to complete resolution recording. Reload the incident before retrying.") from exc

    if role == "worker":
        # BOLA protection: a worker may only change an incident assigned to them.
        # An unassigned incident is authority-only (fail closed): the previous
        # truthiness check let any worker act on every unassigned incident and let
        # a missing incident through. This now matches the detail, timeline and
        # upload endpoints.
        check = db.table("incidents").select("assigned_to").eq("id", incident_id).execute()
        if not check.data:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Incident not found")
        if check.data[0].get("assigned_to") != user["id"]:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Workers can only update incidents assigned to them.",
            )

    # incidents.updated_at is DB-maintained by the 008 trigger; the application
    # deliberately never writes the column so status payloads stay schema-stable.
    update_data: dict = {"status": req.status}

    if role == "authority" and req.worker_id:
        if req.worker_id.startswith("mock-"):
            # Demo substitution is development-only: outside development it would
            # silently assign the incident to a different worker than the one
            # selected, or seed a demo account. Reject instead of guessing.
            if settings.is_production:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Unknown worker. Select a registered worker account.",
                )
            real_workers = db.table("users").select("id").eq("role", "worker").limit(1).execute()
            if real_workers.data:
                update_data["assigned_to"] = real_workers.data[0]["id"]
            else:
                demo_worker_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, req.worker_id))
                try:
                    db.table("users").upsert({
                        "id": demo_worker_id,
                        "full_name": "Field Operations Unit",
                        "email": "worker.field@jansamadhan.gov.in",
                        "role": "worker",
                        "department": "Public Works (PWD)"
                    }).execute()
                    update_data["assigned_to"] = demo_worker_id
                except Exception as seed_err:
                    logger.warning(f"Could not auto-seed worker: {seed_err}")
        else:
            update_data["assigned_to"] = req.worker_id

    # Migration 005 requires the audit table. The audit row is written BEFORE the
    # state change: a failing audit INSERT must never be masked by a successful
    # response, and a failed state change compensates instead of reporting success.
    audit_row = {
        "incident_id": incident_id,
        "updated_by": user["id"],
        "status": req.status,
        "note": req.resolution_notes,
        "after_image_url": req.resolution_image_url,
    }
    audit_id: str | None = None
    try:
        audit_res = db.table("incident_updates").insert(audit_row).execute()
        audit_rows = getattr(audit_res, "data", None) or []
        if audit_rows and isinstance(audit_rows[0], dict):
            audit_id = audit_rows[0].get("id")
    except Exception as audit_err:
        logger.exception("Failed to record incident update audit row")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record the incident update; the incident was not changed.",
        ) from audit_err

    try:
        db.table("incidents").update(update_data).eq("id", incident_id).execute()
    except Exception as update_err:
        _compensate_audit_row(db, audit_id, incident_id)
        logger.exception("Failed to update incident status")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update incident: {str(update_err)}",
        ) from update_err

    # Notifications are post-commit best effort: a notification failure must not
    # turn an already-applied status change into an error response.
    try:
        inc_res = db.table("incidents").select("title, citizen_id, tracking_id, image_url").eq("id", incident_id).execute()
        if inc_res.data:
            incident = inc_res.data[0]

            # Notify citizen
            NotificationService.create_notification(
                db,
                incident["citizen_id"],
                "Incident Status Updated",
                f"Your incident '{incident['title']}' is now {req.status}."
            )

            # Determine actual worker to notify
            notify_worker_id = req.worker_id
            if notify_worker_id and notify_worker_id.startswith("mock-"):
                notify_worker_id = update_data.get("assigned_to")

            # Notify worker if newly assigned and it's a real worker
            if role == "authority" and notify_worker_id:
                NotificationService.create_notification(
                    db,
                    notify_worker_id,
                    "New Assignment",
                    f"You have been assigned to incident '{incident['title']}' ({incident['tracking_id']})."
                )
    except Exception:
        logger.exception("Post-update notifications failed for %s", incident_id)

    return {
        "success": True,
        "message": "Incident updated successfully",
        "data": update_data,
    }

# â”€â”€ Update Incident Triage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        update_data = {}
        if req.category is not None:
            update_data["category"] = req.category
        if req.severity is not None:
            update_data["severity"] = req.severity
        if req.department is not None:
            # Note: in schema, column is 'ai_department'
            update_data["ai_department"] = req.department
            
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
            err_msg += f" Details: {e.details}"
        logger.error(f"Failed to update incident triage: {err_msg}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update triage: {err_msg}",
        ) from e

# â”€â”€ Get Incident Updates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@router.get("/{incident_id}/updates")
def get_incident_updates(
    incident_id: str,
    user: dict = Depends(get_current_user),
):
    db: Client = get_supabase()
    try:
        # Security check: citizen can only view updates for their own incident
        if user["role"] == "citizen":
            inc_check = db.table("incidents").select("citizen_id").eq("id", incident_id).execute()
            if not inc_check.data or inc_check.data[0].get("citizen_id") != user["id"]:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view updates for this incident."
                )

        # Security check: a worker may only read the timeline of an incident
        # assigned to them. Unassigned incidents are authority-only, consistent
        # with the detail endpoint; the timeline leaks notes and proof URLs.
        if user["role"] == "worker":
            inc_check = db.table("incidents").select("assigned_to").eq("id", incident_id).execute()
            if not inc_check.data or inc_check.data[0].get("assigned_to") != user["id"]:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view updates for this incident."
                )

        # Migration 005 requires the audit table. Do not disguise read failures
        # as a complete timeline assembled from a different record type.
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
            "data": res.data or [],
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to fetch incident updates")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch updates: {str(e)}",
        ) from e


# â”€â”€ Re-trigger AI Processing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        # Fetch the incident safely without .single()
        res = db.table("incidents").select("*").eq("id", incident_id).execute()
        if not res.data:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Incident not found")

        incident = res.data[0]

        # Authorization check: citizens can only reprocess their own, workers their assigned
        if user["role"] == "citizen" and incident.get("citizen_id") != user["id"]:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to reprocess this incident."
            )
        if user["role"] == "worker" and incident.get("assigned_to") != user["id"]:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to reprocess this incident."
            )

        # Reset AI status
        db.table("incidents").update({"ai_processing_status": "processing"}).eq("id", incident_id).execute()

        # Re-trigger pipeline
        background_tasks.add_task(
            process_incident_ai_background,
            incident_id,
            incident.get("description") or incident.get("title") or "",
            incident.get("audio_url"),
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
        ) from e
