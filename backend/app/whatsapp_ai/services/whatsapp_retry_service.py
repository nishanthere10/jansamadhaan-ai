import logging
import time
from typing import Set

logger = logging.getLogger(__name__)

class WhatsAppRetryService:
    """
    Handles idempotency to avoid processing the same Twilio webhook twice.
    A simple in-memory LRU cache concept or DB check can be used. 
    For scalability, replace this with Redis or a 'processed_sid' db table.
    """
    
    # In-memory deduplication set
    processed_sids: Set[str] = set()

    @classmethod
    def is_already_processed(cls, message_sid: str) -> bool:
        if message_sid in cls.processed_sids:
            return True
        return False

    @classmethod
    def mark_as_processed(cls, message_sid: str):
        cls.processed_sids.add(message_sid)
        
        # very basic bounds check to prevent memory leak
        if len(cls.processed_sids) > 10000:
            cls.processed_sids.clear()
            
