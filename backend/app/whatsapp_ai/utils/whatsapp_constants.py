"""
Constants used across the WhatsApp AI module.
"""

SUPPORTED_MEDIA_TYPES = {
    # Images
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/gif": "image",
    # Audio
    "audio/mpeg": "audio",
    "audio/mp4": "audio",
    "audio/ogg": "audio",
    "audio/amr": "audio",
    "audio/aac": "audio",
    "audio/wav": "audio",
    # Video
    "video/mp4": "video",
    "video/mpeg": "video"
}

WHATSAPP_UNKNOWN_CATEGORY = "General"
WHATSAPP_UNKNOWN_TITLE = "WhatsApp Complaint"
WHATSAPP_SOURCE = "whatsapp"
