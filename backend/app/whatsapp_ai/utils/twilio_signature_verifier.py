import logging
import os

from fastapi import Request
from twilio.request_validator import RequestValidator

logger = logging.getLogger(__name__)
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "dummy_for_sandbox")

class TwilioSignatureVerifier:
    @staticmethod
    async def verify_request(request: Request) -> bool:
        """
        Validates that incoming webhook is actually from Twilio.
        """
        # In strict local debug/dev mode where Ngrok headers get mangled or sandbox bypass
        if os.getenv("ENVIRONMENT") == "development":
            return True

        validator = RequestValidator(TWILIO_AUTH_TOKEN)
        
        # URL that Twilio hit (Must match webhook config exactly)
        # Handle cases where proxy/ngrok masks the real host
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
