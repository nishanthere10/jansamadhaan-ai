import logging
from fastapi import APIRouter, Request, BackgroundTasks, Response, status, HTTPException
from app.whatsapp_ai.services.twilio_webhook_service import TwilioWebhookService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", status_code=status.HTTP_200_OK)
async def handle_whatsapp_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Receives incoming WhatsApp messages via Twilio Sandbox.
    Returns HTTP 200 with a TwiML <Message> for each conversation step.
    """
    reply_text = ""

    try:
            
        result = await TwilioWebhookService.process_webhook(request, background_tasks)
        step = result.get("status", "")

        # ── Step 1: Ask for complaint description ──
        if step in ("ask_description", "greeting"):
            reply_text = (
                "👋 *Welcome to Jan Samadhan!*\n\n"
                "I'll help you file a grievance step by step.\n\n"
                "*Step 1/3:* Please describe your complaint in detail.\n\n"
                "_Example: 'There is a large pothole on MG Road near the bus stop "
                "causing traffic issues and accidents'_"
            )

        elif step == "ask_description_retry":
            reply_text = (
                "⚠️ Your description is too short.\n\n"
                "Please describe the issue in at least 15 characters "
                "so our AI can properly analyze it.\n\n"
                "_Example: 'Broken streetlight on Park Avenue, "
                "the area is very dark at night'_"
            )

        # ── Step 2: Ask for photo/voice note ──
        elif step == "ask_media":
            reply_text = (
                "✅ *Description saved!*\n\n"
                "*Step 2/3:* Please send a 📸 *photo* or 🎤 *voice note* "
                "of the issue for better evidence.\n\n"
                "Or type *skip* to proceed without media."
            )

        elif step == "ask_media_retry":
            reply_text = (
                "Please send a 📸 *photo* or 🎤 *voice note*, "
                "or type *skip* to proceed without media."
            )

        # ── Step 3: Ask for location ──
        elif step == "ask_location":
            reply_text = (
                "✅ *Got it!*\n\n"
                "*Step 3/3:* Please share your 📍 *location* so we "
                "can dispatch help to the right area.\n\n"
                "👉 Tap *📎 → Location → Send current location*\n\n"
                "Or type *skip* to submit without location."
            )

        elif step == "ask_location_retry":
            reply_text = (
                "Please share your 📍 *location* using:\n"
                "👉 Tap *📎 → Location → Send current location*\n\n"
                "Or type *skip* to submit without location."
            )

        # ── Final: Report submitted ──
        elif step == "success":
            tracking_id = result.get("tracking_id", "N/A")
            reply_text = (
                f"✅ *Report Submitted Successfully!*\n\n"
                f"📋 *Tracking ID:* {tracking_id}\n"
                f"📌 *Status:* Pending Review\n\n"
                f"🤖 Our AI is now analyzing your complaint — "
                f"classifying, scoring severity, and routing to the right department.\n\n"
                f"To file another complaint, type *new*.\n\n"
                f"Thank you for using *Jan Samadhan*. 🙏"
            )

        # ── Duplicate message ──
        elif step == "skipped":
            reply_text = "⚠️ This message was already received."

        else:
            reply_text = "⚠️ Something went wrong. Type *new* to start a fresh complaint."

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling webhook: {e}", exc_info=True)
        reply_text = (
            "❌ Sorry, we encountered an error.\n"
            "Please type *new* to start again."
        )

    # Build TwiML response
    twiml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        "<Response>"
        f"<Message>{_escape_xml(reply_text)}</Message>"
        "</Response>"
    )
    return Response(content=twiml, media_type="application/xml")


def _escape_xml(text: str) -> str:
    """Escape special XML characters in text content."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )
