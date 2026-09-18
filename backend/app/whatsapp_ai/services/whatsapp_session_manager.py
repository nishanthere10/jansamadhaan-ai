"""
WhatsApp Conversation Session Manager

Manages multi-step complaint intake flow:
  Step 1: AWAITING_DESCRIPTION  → User describes the issue
  Step 2: AWAITING_MEDIA        → User sends photo/voice (or skips)
  Step 3: AWAITING_LOCATION     → User sends location pin (or skips)
  Step 4: COMPLETE              → All data collected, create incident

Sessions are stored in-memory (use Redis for production).
Sessions auto-expire after 30 minutes of inactivity.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

# Session timeout in seconds (30 minutes)
SESSION_TIMEOUT = 30 * 60

# Bound the in-memory store: an abandoned conversation must not leak forever.
# Expired sessions are swept whenever a new session starts, and the least
# recently active sessions are evicted first once the cap is reached.
MAX_ACTIVE_SESSIONS = 5_000


@dataclass
class ConversationSession:
    phone_number: str
    step: str = "AWAITING_DESCRIPTION"
    description: str | None = None
    image_url: str | None = None
    audio_url: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def is_expired(self) -> bool:
        return (time.time() - self.updated_at) > SESSION_TIMEOUT

    def touch(self):
        """Update the last activity timestamp."""
        self.updated_at = time.time()


# In-memory session store (phone_number -> ConversationSession)
_sessions: dict[str, ConversationSession] = {}


class WhatsAppSessionManager:
    """Manages conversation sessions for WhatsApp users."""

    @staticmethod
    def get_session(phone_number: str) -> ConversationSession | None:
        """Get an active session for a phone number, or None if expired/missing."""
        session = _sessions.get(phone_number)
        if session and session.is_expired():
            logger.info(f"Session expired for {phone_number}, clearing.")
            del _sessions[phone_number]
            return None
        return session

    @staticmethod
    def sweep_expired() -> int:
        """Drop every expired session and return how many were removed."""
        stale = [phone for phone, s in _sessions.items() if s.is_expired()]
        for phone in stale:
            del _sessions[phone]
        if stale:
            logger.info(f"Swept {len(stale)} expired WhatsApp session(s)")
        return len(stale)

    @staticmethod
    def _enforce_capacity() -> None:
        """Evict least recently active sessions beyond MAX_ACTIVE_SESSIONS."""
        while len(_sessions) > MAX_ACTIVE_SESSIONS:
            oldest = min(_sessions, key=lambda phone: _sessions[phone].updated_at)
            del _sessions[oldest]
            logger.warning(
                f"Evicted least recently active session {oldest} "
                f"(cap {MAX_ACTIVE_SESSIONS})"
            )

    @staticmethod
    def create_session(phone_number: str) -> ConversationSession:
        """Create a fresh conversation session."""
        WhatsAppSessionManager.sweep_expired()
        session = ConversationSession(phone_number=phone_number)
        _sessions[phone_number] = session
        WhatsAppSessionManager._enforce_capacity()
        logger.info(f"New session created for {phone_number} (active={len(_sessions)})")
        return session

    @staticmethod
    def update_session(phone_number: str, **kwargs) -> ConversationSession | None:
        """Update session fields and touch the timestamp."""
        session = _sessions.get(phone_number)
        if not session:
            return None
        for key, value in kwargs.items():
            if hasattr(session, key):
                setattr(session, key, value)
        session.touch()
        return session

    @staticmethod
    def clear_session(phone_number: str):
        """Remove a session after complaint is submitted."""
        if phone_number in _sessions:
            del _sessions[phone_number]
            logger.info(f"Session cleared for {phone_number}")

    @staticmethod
    def get_session_data(phone_number: str) -> dict[str, Any] | None:
        """Get all collected data from a non-expired session as a dict."""
        session = WhatsAppSessionManager.get_session(phone_number)
        if not session:
            return None
        return {
            "description": session.description,
            "image_url": session.image_url,
            "audio_url": session.audio_url,
            "latitude": session.latitude,
            "longitude": session.longitude,
        }
