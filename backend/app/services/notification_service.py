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

    @staticmethod
    def notify_authorities(db: Client, title: str, message: str) -> int:
        """Fan out one notification per authority account.

        Reserved for events an authority must act on (for example an AI failure
        that needs a manual reprocess). Routine progress events are never fanned
        out, which is what keeps this from becoming notification spam.
        """
        try:
            res = db.table("users").select("id").eq("role", "authority").execute()
        except Exception:
            logger.exception("Failed to look up authority recipients")
            return 0
        sent = 0
        for row in (res.data or []):
            if NotificationService.create_notification(db, row.get("id"), title, message):
                sent += 1
        return sent
