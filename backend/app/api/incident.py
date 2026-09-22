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
    IncidentFeedbackRequest,
    IncidentStatusUpdate,
    IncidentTriageUpdate,
)
from app.services.incident_service import IncidentService
from app.services.notification_service import NotificationService
from app.services.resolution_service import submit_resolution
from app.services.sla_service import compute_sla_state

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
            # Extract unique citizen and worker IDs for a single batched user lookup
            citizen_ids = list({inc["citizen_id"] for inc in incidents if inc.get("citizen_id")})
            worker_ids = list({inc["assigned_to"] for inc in incidents if inc.get("assigned_to")})
            all_user_ids = list(set(citizen_ids + worker_ids))

            users_map = {}
            if all_user_ids:
                users_res = db.table("users").select("id, full_name, email, phone, role, department").in_("id", all_user_ids).execute()
                for u in (users_res.data or []):
                    users_map[u["id"]] = u

            # Map the citizen and worker info into each incident
            for inc in incidents:
                c_id = inc.get("citizen_id")
                inc["citizen"] = users_map.get(c_id) if c_id else None
                w_id = inc.get("assigned_to")
                inc["worker"] = users_map.get(w_id) if w_id else None

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


# ── Reverse Geocode Proxy (OSM Policy Compliant) ──────────────────────────────

@router.get("/reverse-geocode")
def reverse_geocode(lat: float, lon: float):
    """
    Reverse-geocode (latitude, longitude) into an address.
    Proxies to OpenStreetMap Nominatim with an explicit User-Agent to comply with OSM Acceptable Use Policy.
    """
    if lat < -90 or lat > 90 or lon < -180 or lon > 180:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Coordinates out of valid range.")

    try:
        import requests
        headers = {
            "User-Agent": "JanSamadhan-AI/1.0 (Civic Grievance System; contact: info@jansamadhan.gov.in)"
        }
        resp = requests.get(
            f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}",
            headers=headers,
            timeout=4.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            display_name = data.get("display_name")
            if display_name:
                return {"success": True, "address": display_name, "data": data}
        return {"success": True, "address": f"Lat: {lat:.4f}, Long: {lon:.4f}", "data": None}
    except Exception as e:
        logger.warning(f"Reverse geocode lookup failed for ({lat}, {lon}): {e}")
        return {"success": True, "address": f"Lat: {lat:.4f}, Long: {lon:.4f}", "data": None}


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

    # Validate magic byte signatures to prevent MIME-spoofing attacks
    def _matches_magic_bytes(mime: str, data: bytes) -> bool:
        if len(data) < 12:
            return False
        if mime == "image/jpeg":
            return data.startswith(b"\xff\xd8\xff")
        if mime == "image/png":
            return data.startswith(b"\x89PNG\r\n\x1a\n")
        if mime == "image/gif":
            return data.startswith(b"GIF87a") or data.startswith(b"GIF89a")
        if mime == "image/webp":
            return data.startswith(b"RIFF") and data[8:12] == b"WEBP"
        return False

    if not _matches_magic_bytes(file.content_type, file_bytes):
        raise HTTPException(
            status_code=http_status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File signature mismatch: contents do not match declared MIME type '{file.content_type}'.",
        )

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


# ── Public Tracking API ───────────────────────────────────────────────────────

# Migration 009 adds incidents.public_tracking_token. Until it is applied, a
# naive query surfaces a raw PostgREST 42703 as an HTTP 500. We detect that
# condition and answer with an actionable 503 instead.
_PG_UNDEFINED_COLUMN = "42703"


def _is_missing_public_token_column(exc: Exception) -> bool:
    """True when PostgREST rejected the query because the token column is absent."""
    text = str(exc)
    return _PG_UNDEFINED_COLUMN in text and "public_tracking_token" in text


@router.get("/public/track/{public_token}")
def get_public_tracking_info(public_token: str, db: Client = Depends(get_supabase)):
    """
    Publicly accessible endpoint for citizen tracking.

    Does NOT require authentication, so the response is built from an explicit
    allow-list of columns. ``select("*")`` is deliberately avoided: a future
    column added to the table must never leak here by default.
    """
    try:
        res = (
            db.table("incidents")
            .select(
                "id, tracking_id, title, description, category, severity, status, "
                "source, created_at, image_url, address, location_name, "
                "ai_department, department, ai_processing_status"
            )
            .eq("public_tracking_token", public_token)
            .execute()
        )
        if not res.data:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Complaint not found. Please check your tracking link.",
            )

        incident = res.data[0]
        incident_id = incident["id"]

        # Incident audit trail. Guarded: public tracking is a transparency
        # feature and must never fail because a side query broke.
        try:
            updates_res = (
                db.table("incident_updates")
                .select("status, note, created_at, after_image_url")
                .eq("incident_id", incident_id)
                .order("created_at", desc=False)
                .execute()
            )
            updates = updates_res.data or []
        except Exception:
            logger.warning("Public tracking: timeline unavailable for %s", incident_id)
            updates = []

        # Canonical verification source. The incidents table has no
        # resolution_verification_status column (it never did); the
        # authoritative record is the resolution_verifications attempt row.
        verification_status = None
        verification_score = None
        try:
            ver_res = (
                db.table("resolution_verifications")
                .select("verification_status, verification_score")
                .eq("incident_id", incident_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if ver_res.data:
                verification_status = ver_res.data[0].get("verification_status")
                verification_score = ver_res.data[0].get("verification_score")
        except Exception:
            logger.debug("Public tracking: no verification record for %s", incident_id)

        # ── Timeline ──
        timeline = [{
            "status": "Report received",
            "time": incident["created_at"],
            "note": "Citizen submitted grievance via "
                    + str(incident.get("source") or "Web").capitalize(),
        }]

        if incident.get("ai_processing_status") == "completed":
            timeline.append({
                "status": "AI triage completed",
                "time": incident["created_at"],
                "note": f"Categorized as {incident.get('category')} "
                        f"({incident.get('severity')})",
            })

        # Only a resolved audit row carries repair proof. Keep the newest one so
        # the public page shows the repair that actually closed the ticket.
        resolution_image = None
        for upd in updates:
            upd_status = (upd.get("status") or "").lower()
            note_str = upd.get("note") or f"Status updated to {upd_status or 'unknown'}"
            if upd_status == "resolved" and verification_status == "verified":
                note_str = "Worker submitted repair, verified by AI."
            if upd_status == "resolved" and upd.get("after_image_url"):
                resolution_image = upd.get("after_image_url")
            timeline.append({
                "status": (upd_status.replace("-", " ").replace("_", " ").capitalize()
                           or "Update"),
                "time": upd["created_at"],
                "note": note_str,
            })

        status = incident.get("status", "pending")

        # Real SLA state (server-side twin of frontend/lib/sla.ts). The previous
        # implementation returned a hardcoded "ON TRACK" for every incident,
        # including ones that were long overdue.
        sla = compute_sla_state(
            created_at=incident.get("created_at"),
            category=incident.get("category"),
            severity=incident.get("severity"),
            status=status,
        )

        # Map to PublicTrackingResponse schema
        from app.schemas.incident import PublicTrackingResponse
        return PublicTrackingResponse(
            tracking_id=incident.get("tracking_id", "Unknown"),
            title=incident.get("title", "Civic Grievance"),
            description=incident.get("description"),
            category=incident.get("category", "General"),
            severity=incident.get("severity", "Medium"),
            status=status,
            department=incident.get("ai_department") or incident.get("department") or "Pending Assignment",
            location_label=incident.get("location_name") or incident.get("address") or "Location Provided",
            source=incident.get("source", "Web"),
            created_at=incident["created_at"],
            sla_state=sla["sla_state"],
            sla_due_at=sla["sla_due_at"],
            sla_hours=sla["sla_hours"],
            citizen_visible_timeline=timeline,
            image_url=incident.get("image_url"),
            resolution_image=resolution_image,
            verification_status=verification_status,
            verification_score=verification_score,
        )
    except HTTPException:
        raise
    except Exception as e:
        if _is_missing_public_token_column(e):
            # Loud in the logs, honest to the client. Not a 500: nothing is
            # broken, the deployment simply has migration 009 pending.
            logger.error(
                "Public tracking unavailable: migration 009_v2_tracking_schema.sql "
                "has not been applied (incidents.public_tracking_token missing)"
            )
            raise HTTPException(
                status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Public tracking is not enabled on this deployment yet.",
            ) from e
        logger.exception("Failed to retrieve public tracking info")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving this complaint.",
        ) from e


# ── List Incidents (role-filtered) ────────────────────────────────────────────

@router.post("/{incident_id}/feedback")
def submit_incident_feedback(
    incident_id: str,
    req: IncidentFeedbackRequest,
    user: dict = Depends(get_current_user),
):
    """Citizen satisfaction rating (1-5) and dispute/reopen for resolved incidents."""
    db: Client = get_supabase()

    try:
        inc_res = db.table("incidents").select("*").eq("id", incident_id).execute()
        if not inc_res.data:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Incident not found")

        incident = inc_res.data[0]

        # Security check: citizens can only review their own incidents
        if user["role"] == "citizen" and incident.get("citizen_id") != user["id"]:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Not authorized to submit feedback for this incident."
            )

        if incident.get("status") not in ("resolved", "closed"):
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Feedback can only be submitted for resolved incidents."
            )

        if req.is_disputed:
            new_status = "in-progress"
            note = f"Citizen disputed resolution (Rating: {req.rating}/5): {req.comment or 'Civic issue still persists.'}"

            # Transition incident back to in-progress
            db.table("incidents").update({"status": new_status}).eq("id", incident_id).execute()

            # Record in timeline
            db.table("incident_updates").insert({
                "incident_id": incident_id,
                "updated_by": user["id"],
                "status": new_status,
                "note": note,
            }).execute()

            # Notify worker of rework requirement
            worker_id = incident.get("assigned_to")
            if worker_id:
                try:
                    NotificationService.create_notification(
                        db,
                        worker_id,
                        "Resolution Disputed — Action Required",
                        f"Citizen disputed the resolution for '{incident.get('title')}'. Status reopened to In Progress."
                    )
                except Exception as notify_err:
                    logger.warning(f"Failed to notify worker of dispute: {notify_err}")

            return {
                "success": True,
                "message": "Dispute recorded. The incident has been reopened for field rework.",
                "data": {"status": new_status, "is_disputed": True}
            }

        else:
            note = f"Citizen verified resolution (Rating: {req.rating}/5 stars): {req.comment or 'Resolution accepted.'}"

            # Record in timeline
            db.table("incident_updates").insert({
                "incident_id": incident_id,
                "updated_by": user["id"],
                "status": "resolved",
                "note": note,
            }).execute()

            # Notify worker of successful rating
            worker_id = incident.get("assigned_to")
            if worker_id:
                try:
                    NotificationService.create_notification(
                        db,
                        worker_id,
                        "Citizen Feedback Received",
                        f"Citizen gave {req.rating}★ rating on '{incident.get('title')}': {req.comment or 'Good job!'}"
                    )
                except Exception as notify_err:
                    logger.warning(f"Failed to notify worker of feedback: {notify_err}")

            return {
                "success": True,
                "message": "Thank you! Your feedback has been recorded.",
                "data": {"status": "resolved", "rating": req.rating}
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to process incident feedback")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process feedback: {str(e)}"
        ) from e
