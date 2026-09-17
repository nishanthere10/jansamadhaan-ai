"""
QR Projects API — CivicResponse AI
Authority-managed transparent public projects with scannable QR codes.
"""

import os
from fastapi import APIRouter, Depends, HTTPException, status as http_status
from app.core.database import get_supabase
from app.core.security import get_current_user
from supabase import Client
from typing import Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class QRProjectCreate(BaseModel):
    title: str
    description: str
    department: str
    budget: Optional[float] = None


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
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
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
        )


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
        )


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
        )
