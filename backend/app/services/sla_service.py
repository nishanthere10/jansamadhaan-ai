"""
Municipal SLA (Service Level Agreement) engine — server-side twin of
``frontend/lib/sla.ts``.

The frontend has always computed SLA badges client-side, which meant the public
tracking API could not report a real SLA state (it shipped a hardcoded
``"ON TRACK"``). This module is the single server-side implementation so the
public tracker and the authority dashboard can never disagree.

The category table and severity modifiers mirror ``frontend/lib/sla.ts``
exactly. If one side changes, change both.
"""

from datetime import datetime, timedelta, timezone

# Standard Indian Municipal SLA targets, in hours (matches lib/sla.ts).
MUNICIPAL_SLA_HOURS: dict[str, int] = {
    # Urgent public safety & health
    "garbage": 12,
    "solid waste management": 12,
    "open manhole": 12,
    "manhole": 12,
    # Critical utility & flow
    "water leak": 24,
    "water-leakage": 24,
    "water supply & pipelines": 24,
    "water supply": 24,
    "stormwater & drainage": 24,
    "drainage": 24,
    "flooding": 24,
    "waterlogging": 24,
    "electricity": 24,
    "electrical danger": 24,
    "streetlight": 24,
    "broken-streetlight": 24,
    "street lighting & electrical": 24,
    "fallen-tree": 24,
    "fallen tree / blockage": 24,
    "public health & sanitation": 24,
    "sanitation": 24,
    "noise & air pollution": 24,
    # Infrastructure repairs
    "pothole": 48,
    "pothole & road hazard": 48,
    "roads & footpaths": 48,
    "road damage": 48,
    "traffic": 48,
    "parking": 48,
    # Environmental & general
    "horticulture & greenery": 72,
    "encroachment & traffic": 72,
    "encroachment": 72,
    "other": 72,
}

DEFAULT_SLA_HOURS = 48
EXPIRING_SOON_HOURS = 3.0

# Terminal statuses: SLA clock stops.
RESOLVED_STATUSES = {"resolved"}
CLOSED_STATUSES = {"rejected", "closed"}


def resolve_category_hours(category: str | None) -> int:
    """Normalize any category string to known municipal SLA target hours."""
    clean = (category or "").strip().lower()
    if clean in MUNICIPAL_SLA_HOURS:
        return MUNICIPAL_SLA_HOURS[clean]

    # Fuzzy matching for composite AI-generated labels (same order as lib/sla.ts).
    if any(k in clean for k in ("garbage", "waste", "dump", "manhole")):
        return 12
    if any(k in clean for k in ("water", "drain", "flood", "pipe")):
        return 24
    if any(k in clean for k in ("light", "electric", "wire", "tree")):
        return 24
    if any(k in clean for k in ("road", "pothole", "footpath", "asphalt")):
        return 48
    if any(k in clean for k in ("encroach", "tree", "park")):
        return 72
    return DEFAULT_SLA_HOURS


def sla_target_hours(category: str | None, severity: str | None) -> int:
    """Category hours adjusted by severity (mirrors lib/sla.ts)."""
    base = resolve_category_hours(category)
    clean_sev = (severity or "medium").strip().lower()
    if clean_sev in ("critical", "emergency"):
        # Emergency: halve the window, floor of 12h.
        return max(12, round(base * 0.5))
    if clean_sev == "low":
        return round(base * 1.5)
    return base


def _parse(created_at: str | None) -> datetime | None:
    if not created_at:
        return None
    raw = str(created_at).strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def compute_sla_state(
    created_at: str | None,
    category: str | None,
    severity: str | None,
    status: str | None,
    now: datetime | None = None,
) -> dict:
    """Return the SLA state for one incident.

    Keys: ``sla_state`` (display string), ``sla_due_at`` (ISO-8601 or None),
    ``sla_hours`` (the allotted window), ``sla_hours_remaining`` (float|None).

    ``sla_state`` is one of: ``MET``, ``CLOSED``, ``BREACHED``,
    ``EXPIRING SOON``, ``ON TRACK``.
    """
    norm_status = (status or "").strip().lower()
    created = _parse(created_at)

    if norm_status in RESOLVED_STATUSES:
        return {
            "sla_state": "MET",
            "sla_due_at": None,
            "sla_hours": 0,
            "sla_hours_remaining": None,
        }
    if norm_status in CLOSED_STATUSES:
        return {
            "sla_state": "CLOSED",
            "sla_due_at": None,
            "sla_hours": 0,
            "sla_hours_remaining": None,
        }
    if created is None:
        # Without a trustworthy timestamp we must not claim "ON TRACK".
        return {
            "sla_state": "UNKNOWN",
            "sla_due_at": None,
            "sla_hours": None,
            "sla_hours_remaining": None,
        }

    hours = sla_target_hours(category, severity)
    due = created + timedelta(hours=hours)
    reference = now or datetime.now(timezone.utc)
    remaining = (due - reference).total_seconds() / 3600.0

    if remaining <= 0:
        state = "BREACHED"
    elif remaining < EXPIRING_SOON_HOURS:
        state = "EXPIRING SOON"
    else:
        state = "ON TRACK"

    return {
        "sla_state": state,
        "sla_due_at": due.isoformat(),
        "sla_hours": hours,
        "sla_hours_remaining": round(remaining, 2),
    }
