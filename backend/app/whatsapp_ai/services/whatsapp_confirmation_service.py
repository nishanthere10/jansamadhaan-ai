import logging

from twilio.rest import Client

from app.core.config import settings

logger = logging.getLogger(__name__)


class WhatsAppConfirmationService:
    @staticmethod
    def send_confirmation(to_phone: str, tracking_id: str, public_tracking_token: str | None = None) -> None:
        """Send the one confirmation that follows a successful complaint.

        Credentials and the public base URL are read from the central settings
        at call time. Never raises: a delivery failure must not fail the webhook
        that already created the incident.
        """
        account_sid = settings.TWILIO_ACCOUNT_SID
        auth_token = settings.TWILIO_AUTH_TOKEN
        if not account_sid or not auth_token:
            logger.warning("Twilio credentials not set, skipping confirmation message.")
            return
            
        try:
            client = Client(account_sid, auth_token)
            
            # Format phone
            formatted_to = f"whatsapp:{to_phone}" if not to_phone.startswith("whatsapp:") else to_phone
            
            message_body = (
                f"Your complaint has been registered successfully.\n\n"
                f"Incident ID: {tracking_id}\n"
                f"Status: Submitted\n\n"
            )
            
            if public_tracking_token:
                # FRONTEND_URL is configuration, never hardcoded: a localhost
                # link sent to a real citizen is an unreachable dead end.
                tracking_link = f"{settings.FRONTEND_URL}/track/{public_tracking_token}"
                message_body += f"Track: {tracking_link}\n\n"
                
            message_body += "We will review your complaint shortly."
            
            message = client.messages.create(
                from_=settings.TWILIO_PHONE_NUMBER,
                body=message_body,
                to=formatted_to
            )
            
            logger.info(f"Confirmation sent to {formatted_to}, SID: {message.sid}")
            
        except Exception as e:
            logger.error(f"Failed to send confirmation message to {to_phone}: {e}")
            # We don't raise here to prevent crashing the webhook response
