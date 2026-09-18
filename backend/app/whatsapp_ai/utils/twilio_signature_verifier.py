"""Twilio webhook authenticity.

The environment gate lives here so no caller re-implements it:
  * ENVIRONMENT == development -> local sandbox bypass, never production
  * anything else              -> validate the signature, failing closed when
                                  the auth token is not configured
"""

import logging

from fastapi import Request
from twilio.request_validator import RequestValidator

from app.core.config import settings

logger = logging.getLogger(__name__)


class TwilioSignatureVerifier:
    @staticmethod
    def dev_bypass_enabled() -> bool:
        """Development-only bypass; production can never satisfy this."""
        return settings.ENVIRONMENT.strip().lower() == "development"

    @staticmethod
    async def verify_request(request: Request) -> bool:
        """Validate that an incoming webhook really came from Twilio."""
        if TwilioSignatureVerifier.dev_bypass_enabled():
            logger.info("Twilio signature bypass active (development only)")
            return True

        auth_token = settings.TWILIO_AUTH_TOKEN
        if not auth_token:
            # Fail closed: without the configured token no signature can be trusted.
            logger.error("TWILIO_AUTH_TOKEN is not configured; rejecting webhook")
            return False

        validator = RequestValidator(auth_token)

        # URL that Twilio hit (must match the webhook configuration exactly).
        # Handle cases where a proxy/ngrok masks the real host.
        forwarded_proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        forwarded_host = request.headers.get("x-forwarded-host", request.url.hostname)
        port = f":{request.url.port}" if request.url.port and request.url.port not in (80, 443) else ""
        url = f"{forwarded_proto}://{forwarded_host}{port}{request.url.path}"

        form_data = await request.form()
        post_vars = dict(form_data)

        signature = request.headers.get("X-Twilio-Signature", "")

        is_valid = validator.validate(url, post_vars, signature)
        if not is_valid:
            logger.warning(f"Twilio signature verification failed for URL: {url}")

        return is_valid
