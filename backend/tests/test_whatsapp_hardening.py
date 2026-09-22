"""
tests/test_whatsapp_hardening.py
────────────────────────────────
Phase 5 WhatsApp contracts (mocked persistence, single-process posture):

- a redelivered MessageSid must not create a second incident or confirmation
- the in-memory conversation and dedup stores must expire and stay bounded
- a successful creation sends exactly one confirmation with the tracking ID
- production must reject a Twilio signature it cannot verify
"""

import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

import app.whatsapp_ai.services.whatsapp_retry_service as retry_module
import app.whatsapp_ai.services.whatsapp_session_manager as session_module
from app.core.config import settings
from app.whatsapp_ai.services.twilio_webhook_service import TwilioWebhookService
from app.whatsapp_ai.services.whatsapp_message_parser import WhatsAppMessageParser
from app.whatsapp_ai.services.whatsapp_retry_service import (
    DEDUP_TTL_SECONDS,
    WhatsAppRetryService,
)
from app.whatsapp_ai.services.whatsapp_session_manager import (
    SESSION_TIMEOUT,
    WhatsAppSessionManager,
    _sessions,
)
from app.whatsapp_ai.utils.twilio_signature_verifier import TwilioSignatureVerifier

WEBHOOK = "app.whatsapp_ai.services.twilio_webhook_service"
PHONE = "+911234567890"
DESCRIPTION = "Large pothole on MG Road near the bus stop"


@pytest.fixture(autouse=True)
def _reset_whatsapp_state():
    """The dedup and session stores are process-global; isolate every test."""
    _sessions.clear()
    WhatsAppRetryService.processed_sids.clear()
    yield
    _sessions.clear()
    WhatsAppRetryService.processed_sids.clear()


def _parsed(sid="SM-1", text="skip"):
    return SimpleNamespace(
        phone_number=PHONE,
        message_sid=sid,
        text=text,
        image_urls=[],
        audio_urls=[],
        latitude=None,
        longitude=None,
    )


def _awaiting_location():
    """Drive a session to the final step so one message completes the flow."""
    WhatsAppSessionManager.create_session(PHONE)
    WhatsAppSessionManager.update_session(
        PHONE, description=DESCRIPTION, step="AWAITING_LOCATION"
    )


class TestWebhookDeduplication:
    @pytest.mark.asyncio
    async def test_redelivered_sid_creates_one_incident_and_one_confirmation(self):
        _awaiting_location()
        parsed = _parsed(sid="SM-DUP")
        create = MagicMock(
            return_value={
                "data": {"tracking_id": "CIV-7", "public_tracking_token": "tok-abc-123"}
            }
        )
        with (
            patch.object(TwilioSignatureVerifier, "verify_request", AsyncMock(return_value=True)),
            patch.object(WhatsAppMessageParser, "parse_webhook", AsyncMock(return_value=parsed)),
            patch(f"{WEBHOOK}.get_supabase", return_value=MagicMock()),
            patch(f"{WEBHOOK}.WhatsAppUserService.get_or_create_citizen", return_value="citizen-1"),
            patch(f"{WEBHOOK}.IncidentService.create_incident", create),
            patch(f"{WEBHOOK}.WhatsAppConfirmationService.send_confirmation") as confirm,
        ):
            first = await TwilioWebhookService.process_webhook(MagicMock(), MagicMock())
            _awaiting_location()
            second = await TwilioWebhookService.process_webhook(MagicMock(), MagicMock())

        assert first == {"status": "success", "tracking_id": "CIV-7"}
        assert second == {"status": "skipped"}
        assert create.call_count == 1
        assert confirm.call_count == 1
        # The third argument is the public tracking token: the confirmation SMS
        # must carry a link that actually resolves, so the token is part of the
        # contract, not an optional extra.
        assert confirm.call_args.args == (PHONE, "CIV-7", "tok-abc-123")

    @pytest.mark.asyncio
    async def test_confirmation_is_not_sent_when_creation_fails(self):
        _awaiting_location()
        with (
            patch.object(TwilioSignatureVerifier, "verify_request", AsyncMock(return_value=True)),
            patch.object(WhatsAppMessageParser, "parse_webhook", AsyncMock(return_value=_parsed())),
            patch(f"{WEBHOOK}.get_supabase", return_value=MagicMock()),
            patch(f"{WEBHOOK}.WhatsAppUserService.get_or_create_citizen", return_value="citizen-1"),
            patch(f"{WEBHOOK}.IncidentService.create_incident", side_effect=RuntimeError("db down")),
            patch(f"{WEBHOOK}.WhatsAppConfirmationService.send_confirmation") as confirm,
        ):
            with pytest.raises(RuntimeError):
                await TwilioWebhookService.process_webhook(MagicMock(), MagicMock())

        confirm.assert_not_called()

    @pytest.mark.asyncio
    async def test_unverifiable_signature_is_rejected_before_parsing(self):
        with (
            patch.object(TwilioSignatureVerifier, "verify_request", AsyncMock(return_value=False)),
            patch.object(WhatsAppMessageParser, "parse_webhook", AsyncMock()) as parse,
        ):
            with pytest.raises(HTTPException) as exc:
                await TwilioWebhookService.process_webhook(MagicMock(), MagicMock())

        assert exc.value.status_code == 403
        parse.assert_not_called()


class TestDedupStoreBounds:
    def test_ttl_expiry_allows_the_sid_to_be_reprocessed(self):
        WhatsAppRetryService.mark_as_processed("SM-OLD")
        assert WhatsAppRetryService.is_already_processed("SM-OLD") is True
        WhatsAppRetryService.processed_sids["SM-OLD"] = time.time() - DEDUP_TTL_SECONDS - 1
        assert WhatsAppRetryService.is_already_processed("SM-OLD") is False
        assert "SM-OLD" not in WhatsAppRetryService.processed_sids

    def test_capacity_evicts_only_the_oldest_not_the_whole_store(self, monkeypatch):
        """Regression: the old implementation called clear() and lost all history."""
        monkeypatch.setattr(retry_module, "MAX_TRACKED_SIDS", 3)
        for sid in ("SM-1", "SM-2", "SM-3", "SM-4", "SM-5"):
            WhatsAppRetryService.mark_as_processed(sid)

        tracked = list(WhatsAppRetryService.processed_sids)
        assert len(tracked) == 3
        assert tracked == ["SM-3", "SM-4", "SM-5"]
        assert WhatsAppRetryService.is_already_processed("SM-5") is True

    def test_blank_sid_is_never_tracked(self):
        WhatsAppRetryService.mark_as_processed("")
        assert WhatsAppRetryService.is_already_processed("") is False
        assert not WhatsAppRetryService.processed_sids


class TestSessionStoreBounds:
    def test_expired_session_is_not_returned_and_is_dropped(self):
        WhatsAppSessionManager.create_session(PHONE)
        _sessions[PHONE].updated_at = time.time() - SESSION_TIMEOUT - 1
        assert WhatsAppSessionManager.get_session(PHONE) is None
        assert PHONE not in _sessions

    def test_session_data_does_not_resurrect_an_expired_session(self):
        WhatsAppSessionManager.create_session(PHONE)
        WhatsAppSessionManager.update_session(PHONE, description=DESCRIPTION)
        _sessions[PHONE].updated_at = time.time() - SESSION_TIMEOUT - 1
        assert WhatsAppSessionManager.get_session_data(PHONE) is None

    def test_sweep_removes_expired_sessions_and_keeps_active_ones(self):
        WhatsAppSessionManager.create_session(PHONE)
        WhatsAppSessionManager.create_session("+919999999999")
        _sessions[PHONE].updated_at = time.time() - SESSION_TIMEOUT - 1

        assert WhatsAppSessionManager.sweep_expired() == 1
        assert PHONE not in _sessions
        assert "+919999999999" in _sessions

    def test_capacity_evicts_the_least_recently_active_session(self, monkeypatch):
        monkeypatch.setattr(session_module, "MAX_ACTIVE_SESSIONS", 2)
        WhatsAppSessionManager.create_session("+910000000001")
        WhatsAppSessionManager.create_session("+910000000002")
        _sessions["+910000000001"].updated_at = time.time() - 300
        _sessions["+910000000002"].updated_at = time.time() - 60

        WhatsAppSessionManager.create_session("+910000000003")

        assert set(_sessions) == {"+910000000002", "+910000000003"}


class _FakeRequest:
    def __init__(self, signature=""):
        self.headers = {"X-Twilio-Signature": signature}
        self.url = SimpleNamespace(
            scheme="https",
            hostname="example.test",
            port=None,
            path="/api/v1/whatsapp/webhook",
        )

    async def form(self):
        return {"From": f"whatsapp:{PHONE}", "Body": "skip"}


class TestSignatureEnforcement:
    @pytest.mark.asyncio
    async def test_development_bypass_skips_validation(self):
        with patch.object(settings, "ENVIRONMENT", "development"):
            assert await TwilioSignatureVerifier.verify_request(_FakeRequest()) is True

    @pytest.mark.asyncio
    async def test_missing_token_fails_closed_outside_development(self):
        with (
            patch.object(settings, "ENVIRONMENT", "production"),
            patch.object(settings, "TWILIO_AUTH_TOKEN", ""),
        ):
            assert await TwilioSignatureVerifier.verify_request(_FakeRequest()) is False

    @pytest.mark.asyncio
    async def test_unset_environment_is_treated_as_production(self):
        """An unset ENVIRONMENT must not silently enable the dev bypass."""
        with (
            patch.object(settings, "ENVIRONMENT", "production"),
            patch.object(settings, "TWILIO_AUTH_TOKEN", "secret"),
            patch("app.whatsapp_ai.utils.twilio_signature_verifier.RequestValidator") as validator,
        ):
            validator.return_value.validate.return_value = False
            assert await TwilioSignatureVerifier.verify_request(_FakeRequest(signature="bad")) is False

        assert validator.call_args.args == ("secret",)

    @pytest.mark.asyncio
    async def test_valid_signature_is_accepted(self):
        with (
            patch.object(settings, "ENVIRONMENT", "production"),
            patch.object(settings, "TWILIO_AUTH_TOKEN", "secret"),
            patch("app.whatsapp_ai.utils.twilio_signature_verifier.RequestValidator") as validator,
        ):
            validator.return_value.validate.return_value = True
            assert await TwilioSignatureVerifier.verify_request(_FakeRequest(signature="good")) is True