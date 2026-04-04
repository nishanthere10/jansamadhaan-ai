from fastapi import APIRouter, Depends, HTTPException, status as http_status
from app.core.database import get_supabase
from app.core.security import get_current_user
from supabase import Client
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("")
def list_notifications(user: dict = Depends(get_current_user)):
    db: Client = get_supabase()
    try:
        res = (
            db.table("notifications")
            .select("*")
            .eq("user_id", user["id"])
            .order("created_at", desc=True)
            .execute()
        )
        return {
            "success": True,
            "message": "Notifications fetched successfully",
            "data": res.data
        }
    except Exception as e:
        logger.exception("Failed to fetch notifications")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch notifications: {str(e)}"
        )

@router.put("/{notification_id}/read")
def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    db: Client = get_supabase()
    try:
        # Verify ownership (optional but good practice)
        res = db.table("notifications").select("user_id").eq("id", notification_id).execute()
        if not res.data or res.data[0]["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to edit this notification.")
            
        update_res = db.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
        return {
            "success": True,
            "message": "Notification marked as read",
            "data": update_res.data
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to mark notification read")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to mark notification: {str(e)}"
        )
