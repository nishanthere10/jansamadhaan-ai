import logging
import os

from twilio.rest import Client

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")  # e.g., "whatsapp:+14155238886"

class WhatsAppConfirmationService:
    @staticmethod
    def send_confirmation(to_phone: str, tracking_id: str):
        """
        Sends a WhatsApp confirmation to the citizen using the Twilio client.
        """
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            logger.warning("Twilio credentials not set, skipping confirmation message.")
            return
            
        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            
            # Format phone
            formatted_to = f"whatsapp:{to_phone}" if not to_phone.startswith("whatsapp:") else to_phone
            
            message_body = (
                f"Your complaint has been registered successfully.\n\n"
                f"Incident ID: {tracking_id}\n"
                f"Status: Submitted\n\n"
                f"We will review your complaint shortly."
            )
            
            message = client.messages.create(
                from_=TWILIO_PHONE_NUMBER,
                body=message_body,
                to=formatted_to
            )
            
            logger.info(f"Confirmation sent to {formatted_to}, SID: {message.sid}")
            
        except Exception as e:
            logger.error(f"Failed to send confirmation message to {to_phone}: {e}")
            # We don't raise here to prevent crashing the webhook response
