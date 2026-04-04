import logging
import requests
from requests.auth import HTTPBasicAuth
import os
from typing import Tuple
from fastapi import HTTPException

logger = logging.getLogger(__name__)

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")


class WhatsAppMediaDownloader:
    """
    Downloads media securely from Twilio with authentication.
    """

    @staticmethod
    def download_media(media_url: str) -> Tuple[bytes, str]:
        """
        Downloads media bytes from Twilio securely.
        Returns (bytes, content_type).
        """
        # SSRF Protection: Ensure the URL strictly belongs to Twilio
        if not media_url.startswith("https://api.twilio.com/"):
            logger.error(f"SSRF attempt blocked. Invalid media URL: {media_url}")
            raise HTTPException(status_code=400, detail="Invalid media URL origin")

        MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB limit

        # Twilio media URLs require HTTP Basic Auth
        auth = None
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            auth = HTTPBasicAuth(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        else:
            logger.warning("Twilio credentials not set — media download may fail with 401")

        try:
            logger.info(f"Downloading media from {media_url}")
            with requests.get(media_url, timeout=30, stream=True, auth=auth) as response:
                response.raise_for_status()

                content_type = response.headers.get("Content-Type", "application/octet-stream")

                content_length = response.headers.get("Content-Length")
                if content_length and int(content_length) > MAX_FILE_BYTES:
                    raise ValueError(f"Media exceeds max size of {MAX_FILE_BYTES} bytes")

                chunks = []
                downloaded_size = 0
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        downloaded_size += len(chunk)
                        if downloaded_size > MAX_FILE_BYTES:
                            raise ValueError("Media exceeds max size mid-stream")
                        chunks.append(chunk)

                media_bytes = b"".join(chunks)
                logger.info(f"Downloaded {downloaded_size} bytes, type={content_type}")
                return media_bytes, content_type

        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error downloading media: {e.response.status_code} — {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to download media from {media_url}: {e}")
            raise
