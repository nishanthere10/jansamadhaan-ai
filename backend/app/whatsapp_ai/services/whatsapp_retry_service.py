"""Twilio webhook idempotency.

In-memory by design: this deployment is a single-process demo, so the store is
process-local. A restart forgets every MessageSid, which means durable
exactly-once delivery is explicitly NOT claimed. Making the store survive
restarts requires a persistent table and is tracked in remaining.md.

Entries expire so the store cannot grow without bound. The previous "clear the
whole set once it gets large" behaviour was removed because it re-opened
deduplication for every recently processed message at once.
"""

import logging
import time
from collections import OrderedDict

logger = logging.getLogger(__name__)

# Twilio retries a failed webhook over minutes, not hours. Keeping entries far
# beyond that window only consumes memory.
DEDUP_TTL_SECONDS = 60 * 60

# Hard cap; the oldest entries are evicted first, never the whole store.
MAX_TRACKED_SIDS = 10_000


class WhatsAppRetryService:
    """Tracks processed MessageSids so a redelivered webhook becomes a no-op."""

    # message_sid -> epoch seconds when it was first accepted
    processed_sids: OrderedDict[str, float] = OrderedDict()

    @classmethod
    def is_already_processed(cls, message_sid: str) -> bool:
        """True when this MessageSid was accepted within the TTL window."""
        if not message_sid:
            return False
        seen_at = cls.processed_sids.get(message_sid)
        if seen_at is None:
            return False
        if (time.time() - seen_at) > DEDUP_TTL_SECONDS:
            del cls.processed_sids[message_sid]
            return False
        return True

    @classmethod
    def mark_as_processed(cls, message_sid: str) -> None:
        """Record a MessageSid as accepted and keep the store bounded."""
        if not message_sid:
            return
        cls.processed_sids[message_sid] = time.time()
        cls.processed_sids.move_to_end(message_sid)
        cls._prune()

    @classmethod
    def _prune(cls) -> None:
        """Expire stale entries, then evict oldest-first beyond the cap."""
        now = time.time()
        stale = [sid for sid, seen in cls.processed_sids.items()
                 if (now - seen) > DEDUP_TTL_SECONDS]
        for sid in stale:
            del cls.processed_sids[sid]
        while len(cls.processed_sids) > MAX_TRACKED_SIDS:
            evicted, _ = cls.processed_sids.popitem(last=False)
            logger.warning(f"Evicted oldest processed MessageSid {evicted}")
