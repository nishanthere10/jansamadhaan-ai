"""
Twilio Webhook Service — Conversational Multi-Step Flow

Flow:
  1. User sends anything → Bot asks for complaint description
  2. User sends description (text) → Bot asks for photo/voice note
  3. User sends media OR "skip" → Bot asks for location
  4. User sends location OR "skip" → Bot creates incident with ALL collected data
"""

import logging
import re

from fastapi import BackgroundTasks, HTTPException, Request

from app.core.database import get_supabase
from app.services.incident_service import IncidentService
from app.whatsapp_ai.services.whatsapp_confirmation_service import (
    WhatsAppConfirmationService,
)
from app.whatsapp_ai.services.whatsapp_media_service import WhatsAppMediaService

# Services
from app.whatsapp_ai.services.whatsapp_message_parser import WhatsAppMessageParser
from app.whatsapp_ai.services.whatsapp_retry_service import WhatsAppRetryService
from app.whatsapp_ai.services.whatsapp_session_manager import WhatsAppSessionManager
from app.whatsapp_ai.services.whatsapp_user_service import WhatsAppUserService

# Utilities
from app.whatsapp_ai.utils.twilio_signature_verifier import TwilioSignatureVerifier

logger = logging.getLogger(__name__)

# Skip patterns (user wants to skip a step)
SKIP_PATTERNS = re.compile(
    r"^(skip|no|nahi|nope|none|na|cancel|pass|chhodo|next)[\s!.?]*$",
    re.IGNORECASE
)

# Reset / new complaint patterns
RESET_PATTERNS = re.compile(
    r"^(new|reset|start(\s+over)?|restart|naya|naya\s+complaint)[\s!.?]*$",
    re.IGNORECASE
)


class TwilioWebhookService:
    @staticmethod
    async def process_webhook(request: Request, background_tasks: BackgroundTasks) -> dict:
        """
        Conversational multi-step pipeline for WhatsApp complaint intake.
        """
        # 1. Verify Signature. The verifier owns the environment gate and fails
        # closed outside development, so this is the single enforcement point.
        if not await TwilioSignatureVerifier.verify_request(request):
            raise HTTPException(status_code=403, detail="Invalid Twilio signature")

        # 2. Parse Payload
        parsed = await WhatsAppMessageParser.parse_webhook(request)
        logger.info(
            f"Parsed: from={parsed.phone_number}, text='{(parsed.text or '')[:50]}', "
            f"images={len(parsed.image_urls)}, audio={len(parsed.audio_urls)}, "
            f"location={parsed.latitude},{parsed.longitude}"
        )

        # 3. Idempotency Check
        if WhatsAppRetryService.is_already_processed(parsed.message_sid):
            return {"status": "skipped"}

        WhatsAppRetryService.mark_as_processed(parsed.message_sid)

        # 4. Get or create session
        phone = parsed.phone_number
        text = (parsed.text or "").strip()
        session = WhatsAppSessionManager.get_session(phone)

        # ── Universal Media & Location Capture ──
        # Don't drop media/location just because it was sent out of order
        has_media = bool(parsed.image_urls or parsed.audio_urls)
        has_location = bool(parsed.latitude and parsed.longitude)
        
        if session and has_media:
            await TwilioWebhookService._capture_media(phone, parsed)
        if session and has_location:
            await TwilioWebhookService._capture_location(phone, parsed)

        # Handle "new" / "reset" command
        if text and RESET_PATTERNS.match(text):
            WhatsAppSessionManager.clear_session(phone)
            session = None

        # ── No active session → Start fresh ──
        if not session:
            session = WhatsAppSessionManager.create_session(phone)
            
            # Universal capture for the brand new session too
            if has_media:
                await TwilioWebhookService._capture_media(phone, parsed)
            if has_location:
                await TwilioWebhookService._capture_location(phone, parsed)

            # If the very first message already has substantial text, save it
            if text and len(text) >= 15 and not SKIP_PATTERNS.match(text):
                WhatsAppSessionManager.update_session(phone, description=text, step="AWAITING_MEDIA")
                
                # Check what we already collected up till now
                updated = WhatsAppSessionManager.get_session(phone)
                
                if updated and updated.image_url and updated.latitude:
                    return await TwilioWebhookService._submit_complaint(phone, background_tasks)
                elif updated and updated.image_url:
                    WhatsAppSessionManager.update_session(phone, step="AWAITING_LOCATION")
                    return {"status": "ask_location"}

                return {"status": "ask_media"}

            # If First message is just media/location, we saved it above. Now ask for description.
            return {"status": "ask_description"}

        # ── Active session → Handle based on current step ──
        session.touch()

        if session.step == "AWAITING_DESCRIPTION":
            return await TwilioWebhookService._handle_description_step(phone, text, parsed)

        elif session.step == "AWAITING_MEDIA":
            return await TwilioWebhookService._handle_media_step(phone, text, parsed, background_tasks)

        elif session.step == "AWAITING_LOCATION":
            return await TwilioWebhookService._handle_location_step(phone, text, parsed, background_tasks)

        # Shouldn't reach here, but handle gracefully
        return {"status": "ask_description"}


    # ── Step Handlers ──

    @staticmethod
    async def _handle_description_step(phone: str, text: str, parsed) -> dict:
        """Step 1: Collect complaint description."""

        # Check if they sent media (image/audio) as their complaint
        has_media = bool(parsed.image_urls or parsed.audio_urls)

        if has_media:
            # They sent an image/audio — capture it and use as evidence
            await TwilioWebhookService._capture_media(phone, parsed)
            if text and len(text) >= 10:
                WhatsAppSessionManager.update_session(phone, description=text)

            # If only media, set a placeholder description
            session = WhatsAppSessionManager.get_session(phone)
            if not session.description:
                if parsed.audio_urls:
                    WhatsAppSessionManager.update_session(
                        phone, description="[Voice complaint — transcription pending]"
                    )
                else:
                    WhatsAppSessionManager.update_session(
                        phone, description="[Photo complaint — AI analysis pending]"
                    )

            WhatsAppSessionManager.update_session(phone, step="AWAITING_LOCATION")
            await TwilioWebhookService._capture_location(phone, parsed)
            return {"status": "ask_location"}

        if not text or len(text) < 15:
            return {"status": "ask_description_retry"}

        if SKIP_PATTERNS.match(text):
            return {"status": "ask_description_retry"}

        # Valid description
        WhatsAppSessionManager.update_session(phone, description=text, step="AWAITING_MEDIA")
        await TwilioWebhookService._capture_location(phone, parsed)
        return {"status": "ask_media"}

    @staticmethod
    async def _handle_media_step(phone: str, text: str, parsed, background_tasks) -> dict:
        """Step 2: Collect photo/voice note (optional)."""

        # User wants to skip
        if text and SKIP_PATTERNS.match(text):
            WhatsAppSessionManager.update_session(phone, step="AWAITING_LOCATION")
            return {"status": "ask_location"}

        # Check for media
        has_media = bool(parsed.image_urls or parsed.audio_urls)
        if has_media:
            await TwilioWebhookService._capture_media(phone, parsed)
            WhatsAppSessionManager.update_session(phone, step="AWAITING_LOCATION")
            await TwilioWebhookService._capture_location(phone, parsed)
            return {"status": "ask_location"}

        # They sent text but no media — might be additional description, capture and move on
        if text and len(text) >= 10:
            session = WhatsAppSessionManager.get_session(phone)
            if session and session.description:
                # Append to existing description
                updated_desc = session.description + " | " + text
                WhatsAppSessionManager.update_session(phone, description=updated_desc)
            WhatsAppSessionManager.update_session(phone, step="AWAITING_LOCATION")
            return {"status": "ask_location"}

        # Prompt again
        return {"status": "ask_media_retry"}

    @staticmethod
    async def _handle_location_step(phone: str, text: str, parsed, background_tasks) -> dict:
        """Step 3: Collect location (optional), then submit."""

        has_location = bool(parsed.latitude and parsed.longitude)

        if has_location:
            await TwilioWebhookService._capture_location(phone, parsed)
            return await TwilioWebhookService._submit_complaint(phone, background_tasks)

        if text and SKIP_PATTERNS.match(text):
            return await TwilioWebhookService._submit_complaint(phone, background_tasks)

        # They sent something else — just submit
        if text:
            # Might be additional text, append to description
            session = WhatsAppSessionManager.get_session(phone)
            if session and session.description and len(text) >= 5:
                updated_desc = session.description + " | " + text
                WhatsAppSessionManager.update_session(phone, description=updated_desc)
            return await TwilioWebhookService._submit_complaint(phone, background_tasks)

        return {"status": "ask_location_retry"}

    # ── Media & Location Capture Helpers ──

    @staticmethod
    async def _capture_media(phone: str, parsed) -> None:
        """Download and upload any attached media to Supabase Storage."""
        if parsed.image_urls:
            try:
                url = WhatsAppMediaService.process_and_upload_media(
                    parsed.image_urls[0], "image/jpeg"
                )
                WhatsAppSessionManager.update_session(phone, image_url=url)
                logger.info(f"Image captured for session {phone}: {url}")
            except Exception as e:
                logger.error(f"Failed to capture image: {e}")

        if parsed.audio_urls:
            try:
                url = WhatsAppMediaService.process_and_upload_media(
                    parsed.audio_urls[0], "audio/ogg"
                )
                WhatsAppSessionManager.update_session(phone, audio_url=url)
                logger.info(f"Audio captured for session {phone}: {url}")
            except Exception as e:
                logger.error(f"Failed to capture audio: {e}")

    @staticmethod
    async def _capture_location(phone: str, parsed) -> None:
        """Store location if provided."""
        if parsed.latitude and parsed.longitude:
            WhatsAppSessionManager.update_session(
                phone, latitude=parsed.latitude, longitude=parsed.longitude
            )
            logger.info(f"Location captured for session {phone}: {parsed.latitude},{parsed.longitude}")

    # ── Final Submission ──

    @staticmethod
    async def _submit_complaint(phone: str, background_tasks: BackgroundTasks) -> dict:
        """Create the incident with all collected session data."""
        session = WhatsAppSessionManager.get_session(phone)
        if not session or not session.description:
            WhatsAppSessionManager.clear_session(phone)
            return {"status": "ask_description"}

        try:
            db = get_supabase()
            citizen_id = WhatsAppUserService.get_or_create_citizen(db, phone)

            incident_response = IncidentService.create_incident(
                db=db,
                background_tasks=background_tasks,
                citizen_id=citizen_id,
                title="WhatsApp Complaint",
                description=session.description,
                category="General",
                location_lat=session.latitude,
                location_lng=session.longitude,
                image_url=session.image_url,
                audio_url=session.audio_url,
                source="whatsapp"
            )

            tracking_id = incident_response["data"].get("tracking_id", "Unknown")
            public_tracking_token = incident_response["data"].get("public_tracking_token")
            logger.info(
                f"✅ Complaint submitted for {phone}: {tracking_id} | "
                f"desc_len={len(session.description)}, "
                f"image={'yes' if session.image_url else 'no'}, "
                f"audio={'yes' if session.audio_url else 'no'}, "
                f"location={'yes' if session.latitude else 'no'}"
            )

            # Clear session after successful submission
            WhatsAppSessionManager.clear_session(phone)

            # Exactly one confirmation per successfully created complaint. It is
            # never sent on the failure path, and a redelivered webhook is stopped
            # earlier by MessageSid deduplication, so retries cannot duplicate it.
            WhatsAppConfirmationService.send_confirmation(phone, tracking_id, public_tracking_token)

            return {"status": "success", "tracking_id": tracking_id}

        except Exception as e:
            logger.error(f"Failed to submit complaint for {phone}: {e}", exc_info=True)
            WhatsAppSessionManager.clear_session(phone)
            raise

