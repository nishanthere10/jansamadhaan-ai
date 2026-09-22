"""
QR Projects API — CivicResponse AI
Authority-managed transparent public projects with scannable QR codes.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from pydantic import BaseModel
from supabase import Client

from app.core.config import settings
from app.core.database import get_supabase
from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


class QRProjectCreate(BaseModel):
    title: str
    description: str
    department: str
    budget: float | None = None


class QRProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    department: str | None = None
    budget: float | None = None
    status: str | None = None
    progress_percentage: int | None = None


# ── Create Project ────────────────────────────────────────────────────────────

@router.post("", status_code=http_status.HTTP_201_CREATED)
def create_project(
    req: QRProjectCreate,
    user: dict = Depends(get_current_user),
):
    if user["role"] != "authority":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only authority accounts can create QR projects.",
        )

    db: Client = get_supabase()

    insert_data = {
        "title": req.title,
        "description": req.description,
        "department": req.department,
        "budget": req.budget,
        "created_by": user["id"],
        "status": "planned",
        "progress_percentage": 0,
    }

    try:
        res = db.table("qr_projects").insert(insert_data).execute()
        project = res.data[0]

        # Auto-generate QR code URL pointing to the public tracker page
        project_id = project["id"]
        # settings.FRONTEND_URL is validator-normalized (trailing slash and
        # stray whitespace/CRLF stripped) — a raw os.getenv() call would skip
        # that guard and bake a poisoned URL into the stored qr_code_url.
        frontend_url = settings.FRONTEND_URL
        qr_url = (
            f"https://api.qrserver.com/v1/create-qr-code/"
            f"?size=150x150&data={frontend_url}/track/{project_id}"
        )
        db.table("qr_projects").update({"qr_code_url": qr_url}).eq("id", project_id).execute()
        project["qr_code_url"] = qr_url

        logger.info(f"QR project created: {project_id} by authority {user['id']}")
        return {"success": True, "message": "Project created successfully", "data": project}

    except Exception as e:
        logger.exception("Failed to create QR project")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}",
        ) from e


# ── List All Projects (public) ────────────────────────────────────────────────

@router.get("")
def list_projects():
    """Public endpoint — no authentication required for QR scan transparency."""
    db: Client = get_supabase()
    try:
        res = db.table("qr_projects").select("*").order("created_at", desc=True).execute()
        return {"success": True, "message": "Projects fetched", "data": res.data}
    except Exception as e:
        logger.exception("Failed to list QR projects")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch projects: {str(e)}",
        ) from e


# ── Get Single Project (public) ───────────────────────────────────────────────

@router.get("/{project_id}")
def get_project(project_id: str):
    """Public endpoint — fetch single QR project by ID for transparency tracking."""
    db: Client = get_supabase()
    try:
        res = db.table("qr_projects").select("*").eq("id", project_id).execute()
        if not res.data:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found")
        return {"success": True, "message": "Project fetched successfully", "data": res.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to fetch QR project {project_id}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch project: {str(e)}",
        ) from e


# ── Update Project (authority only) ──────────────────────────────────────────

@router.put("/{project_id}")
def update_project(
    project_id: str,
    req: QRProjectUpdate,
    user: dict = Depends(get_current_user),
):
    """Update progress, budget, status, or details of a QR project."""
    if user["role"] != "authority":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only authority accounts can update QR projects.",
        )

    db: Client = get_supabase()

    try:
        # Check project exists
        check = db.table("qr_projects").select("*").eq("id", project_id).execute()
        if not check.data:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found")

        update_data = {}
        if req.title is not None:
            update_data["title"] = req.title.strip()
        if req.description is not None:
            update_data["description"] = req.description.strip()
        if req.department is not None:
            update_data["department"] = req.department.strip()
        if req.budget is not None:
            update_data["budget"] = req.budget
        if req.status is not None:
            valid_statuses = {"planned", "active", "delayed", "completed", "cancelled"}
            clean_status = req.status.strip().lower()
            if clean_status not in valid_statuses:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Invalid status '{req.status}'. Must be one of {valid_statuses}"
                )
            update_data["status"] = clean_status
        if req.progress_percentage is not None:
            if req.progress_percentage < 0 or req.progress_percentage > 100:
                raise HTTPException(
                    status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="progress_percentage must be between 0 and 100"
                )
            update_data["progress_percentage"] = req.progress_percentage

        if not update_data:
            return {"success": True, "message": "No changes requested", "data": check.data[0]}

        res = db.table("qr_projects").update(update_data).eq("id", project_id).execute()
        updated = res.data[0] if res.data else update_data

        logger.info(f"QR project {project_id} updated by authority {user['id']}: {list(update_data.keys())}")
        return {"success": True, "message": "Project updated successfully", "data": updated}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to update QR project {project_id}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update project: {str(e)}",
        ) from e


# ── Delete Project (authority only) ──────────────────────────────────────────

@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    user: dict = Depends(get_current_user),
):
    """Delete a QR project."""
    if user["role"] != "authority":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only authority accounts can delete QR projects.",
        )

    db: Client = get_supabase()
    try:
        check = db.table("qr_projects").select("id").eq("id", project_id).execute()
        if not check.data:
            raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Project not found")

        db.table("qr_projects").delete().eq("id", project_id).execute()
        logger.info(f"QR project {project_id} deleted by authority {user['id']}")
        return {"success": True, "message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to delete QR project {project_id}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete project: {str(e)}",
        ) from e
