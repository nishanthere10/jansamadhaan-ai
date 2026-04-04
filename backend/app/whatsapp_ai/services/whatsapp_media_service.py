import logging
import uuid
from typing import Optional
from app.core.database import get_supabase
from app.whatsapp_ai.utils.whatsapp_media_downloader import WhatsAppMediaDownloader
from app.whatsapp_ai.utils.whatsapp_constants import SUPPORTED_MEDIA_TYPES

logger = logging.getLogger(__name__)

class WhatsAppMediaService:
    @staticmethod
    def process_and_upload_media(media_url: str, media_type: str) -> Optional[str]:
        """
        Downloads media from Twilio and uploads it to Supabase Storage.
        Returns the public Supabase URL, or None if failed/unsupported.
        """
        if media_type not in SUPPORTED_MEDIA_TYPES:
            logger.warning(f"Unsupported media type received: {media_type}")
            return None
            
        try:
            # 1. Download
            media_bytes, content_type = WhatsAppMediaDownloader.download_media(media_url)
            
            # 2. Upload to Supabase
            db = get_supabase()
            ext = media_type.split("/")[-1]
            if ext == "jpeg": ext = "jpg"
            file_name = f"whatsapp_{uuid.uuid4()}.{ext}"
            
            # Bucket logic - assuming 'grievance_images' is dual-purpose for audio/video too,
            # or could be specific buckets if separated.
            bucket_name = "grievance_images"
            
            db.storage.from_(bucket_name).upload(
                file_name, media_bytes, {"content-type": content_type}
            )
            
            public_url = db.storage.from_(bucket_name).get_public_url(file_name)
            logger.info(f"Successfully uploaded WhatsApp media to: {public_url}")
            return public_url
            
        except Exception as e:
            logger.error(f"Failed to process and upload media {media_url}: {e}")
            # Do not raise here; if media fails, still process text complain gracefully.
            return None
