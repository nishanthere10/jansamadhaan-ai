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
            try:
                res = (
                    db.table("incidents")
                    .select("*")
                    .eq("assigned_to", user["id"])
                    .order("created_at", desc=True)
                    .execute()
                )
            except Exception as w_err:
                logger.warning(f"Could not filter incidents by assigned_to (column may not exist): {w_err}")
                res = (
                    db.table("incidents")
                    .select("*")
                    .order("created_at", desc=True)
                    .limit(50)
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


# ── Get Single Incident ───────────────────────────────────────────────────────

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

        # Security check: workers can only view their assigned incidents (if assigned_to is set)
        if user["role"] == "worker" and incident.get("assigned_to") and incident.get("assigned_to") != user["id"]:
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

    if role == "worker":
        # BOLA protection: worker can only update incidents assigned to them
        check = db.table("incidents").select("assigned_to").eq("id", incident_id).execute()
        if check.data and check.data[0].get("assigned_to") and check.data[0].get("assigned_to") != user["id"]:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Workers can only update incidents assigned to them.",
            )

    # Note: 'updated_at' is omitted because public.incidents has no updated_at column in the SQL schema
    update_data: dict = {"status": req.status}

    if role == "authority" and req.worker_id:
        if req.worker_id.startswith("mock-"):
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

    try:
        try:
            db.table("incidents").update(update_data).eq("id", incident_id).execute()
        except Exception as upd_err:
            # If assigned_to column does not exist in the incidents table, update status without it
            if "assigned_to" in update_data and ("column" in str(upd_err).lower() or "assigned_to" in str(upd_err).lower()):
                logger.warning(f"assigned_to column not in incidents table; updating status without assigned_to: {upd_err}")
                safe_update = {k: v for k, v in update_data.items() if k != "assigned_to"}
                db.table("incidents").update(safe_update).eq("id", incident_id).execute()
            else:
                raise

        # Best-effort insert into incident_updates (table may not exist in all Supabase setups)
        try:
            update_log = {
                "incident_id": incident_id,
                "updated_by": user["id"],
                "status": req.status,
                "note": req.resolution_notes,
                "after_image_url": req.resolution_image_url,
            }
            db.table("incident_updates").insert(update_log).execute()
        except Exception as log_err:
            logger.warning(f"Could not insert incident_updates row (table may not exist): {log_err}")

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
                current_user_id = user["id"]
                def background_verify():
                    try:
                        verification = ResolutionVerificationService.verify_resolution(
                            before_url=incident["image_url"],
                            after_url=req.resolution_image_url,
                            incident_title=incident["title"]
                        )
                        is_verified = bool(verification.get("resolution_verified", False))
                        confidence = float(verification.get("confidence", 0.0))
                        status_label = "resolved" if is_verified else "in-progress"

                        # 1. Record in public.resolution_verifications (matches database schema)
                        try:
                            db.table("resolution_verifications").insert({
                                "incident_id": incident_id,
                                "before_image_url": incident.get("image_url"),
                                "after_image_url": req.resolution_image_url,
                                "verification_score": confidence,
                                "verification_status": "verified" if is_verified else "rejected",
                                "manual_review_required": not is_verified,
                            }).execute()
                        except Exception as rv_err:
                            logger.warning(f"Could not record resolution_verification row: {rv_err}")

                        # 2. Try recording in incident_updates if table exists
                        try:
                            db.table("incident_updates").insert({
                                "incident_id": incident_id,
                                "updated_by": current_user_id,
                                "status": status_label,
                                "note": f"AI Verification: {verification.get('notes', '')} (Confidence: {confidence})"
                            }).execute()
                        except Exception:
                            pass

                        if not is_verified:
                            # Revert incident back to in-progress so field work can be completed
                            db.table("incidents").update({
                                "status": "in-progress"
                            }).eq("id", incident_id).execute()
                            logger.info(f"Reverted incident {incident_id} to in-progress due to unverified resolution proof.")
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
            err_msg += f" Details: {getattr(e, 'details')}"
        logger.error(f"Failed to update incident triage: {err_msg}\n{traceback.format_exc()}")
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
        # Security check: citizen can only view updates for their own incident
        if user["role"] == "citizen":
            inc_check = db.table("incidents").select("citizen_id").eq("id", incident_id).execute()
            if not inc_check.data or inc_check.data[0].get("citizen_id") != user["id"]:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view updates for this incident."
                )

        # Try fetching from incident_updates; fallback to resolution_verifications if table missing
        try:
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
        except Exception as tbl_err:
            logger.warning(f"incident_updates table query failed, falling back to resolution_verifications: {tbl_err}")
            rv_res = (
                db.table("resolution_verifications")
                .select("*")
                .eq("incident_id", incident_id)
                .order("created_at", desc=False)
                .execute()
            )
            data = [
                {
                    "id": r["id"],
                    "incident_id": r["incident_id"],
                    "status": r.get("verification_status"),
                    "note": f"Resolution Verification (Confidence: {r.get('verification_score', 0)})",
                    "before_image_url": r.get("before_image_url"),
                    "after_image_url": r.get("after_image_url"),
                    "created_at": r.get("created_at"),
                }
                for r in (rv_res.data or [])
            ]
            return {
                "success": True,
                "message": "Incident updates fetched successfully",
                "data": data,
            }
    except HTTPException:
        raise
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
        )
