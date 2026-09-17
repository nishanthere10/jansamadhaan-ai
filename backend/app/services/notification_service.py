import logging

from supabase import Client

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def create_notification(
        db: Client,
        user_id: str,
        title: str,
        message: str
    ) -> dict | None:
        """Creates a push/in-app notification for a targeted user."""
        if not user_id:
            return None
        try:
            data = {
                "user_id": user_id,
                "title": title,
                "message": message,
                "is_read": False
            }
            res = db.table("notifications").insert(data).execute()
            
            if res.data:
                logger.info(f"Notification '{title}' triggered for user {user_id}")
                return res.data[0]
            return None
        except Exception as e:
            # We don't want notification failure to break the main caller thread
            logger.error(f"Failed to create notification: {e}")
            return None
