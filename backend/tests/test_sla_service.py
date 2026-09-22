"""SLA engine tests.

``app/services/sla_service.py`` mirrors ``frontend/lib/sla.ts``. These tests pin
the shared numbers so the public tracker and the authority dashboard cannot
silently drift apart.
"""
from datetime import datetime, timedelta, timezone

from app.services.sla_service import (
    DEFAULT_SLA_HOURS,
    compute_sla_state,
    resolve_category_hours,
    sla_target_hours,
)


def _ago(hours: float) -> str:
    return (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()


# ── Category resolution ───────────────────────────────────────────────────────

def test_exact_category_targets():
    assert resolve_category_hours("garbage") == 12
    assert resolve_category_hours("water leak") == 24
    assert resolve_category_hours("pothole") == 48
    assert resolve_category_hours("other") == 72


def test_fuzzy_category_targets_match_frontend():
    assert resolve_category_hours("Solid Waste Management Overflow") == 12
    assert resolve_category_hours("Storm Water Drainage Blockage") == 24
    assert resolve_category_hours("Broken Streetlight on Main Road") == 24
    assert resolve_category_hours("Road Damage / Pothole Cluster") == 48


def test_unknown_category_falls_back_to_default():
    assert resolve_category_hours("teleportation") == DEFAULT_SLA_HOURS
    assert resolve_category_hours(None) == DEFAULT_SLA_HOURS


# ── Severity modifiers ────────────────────────────────────────────────────────

def test_severity_modifiers():
    assert sla_target_hours("pothole", "high") == 48          # unchanged
    assert sla_target_hours("pothole", "critical") == 24      # halved
    assert sla_target_hours("pothole", "low") == 72           # x1.5
    # Emergency floors at 12h even when halving a 12h window.
    assert sla_target_hours("garbage", "critical") == 12


# ── State machine ─────────────────────────────────────────────────────────────

def test_resolved_and_closed_stop_the_clock():
    resolved = compute_sla_state(_ago(500), "pothole", "high", "resolved")
    assert resolved["sla_state"] == "MET"
    assert resolved["sla_due_at"] is None

    closed = compute_sla_state(_ago(500), "pothole", "high", "closed")
    assert closed["sla_state"] == "CLOSED"

    rejected = compute_sla_state(_ago(500), "pothole", "high", "rejected")
    assert rejected["sla_state"] == "CLOSED"


def test_overdue_incident_reports_breached():
    state = compute_sla_state(_ago(100), "pothole", "high", "pending")
    assert state["sla_state"] == "BREACHED"
    assert state["sla_hours"] == 48
    assert state["sla_hours_remaining"] < 0


def test_fresh_incident_reports_on_track():
    state = compute_sla_state(_ago(1), "pothole", "high", "pending")
    assert state["sla_state"] == "ON TRACK"
    assert state["sla_hours_remaining"] > 3


def test_near_deadline_reports_expiring_soon():
    state = compute_sla_state(_ago(46.5), "pothole", "high", "pending")
    assert state["sla_state"] == "EXPIRING SOON"
    assert 0 < state["sla_hours_remaining"] < 3


def test_unparseable_timestamp_is_not_claimed_as_on_track():
    """Missing data must never masquerade as a healthy SLA."""
    state = compute_sla_state("not-a-date", "pothole", "high", "pending")
    assert state["sla_state"] == "UNKNOWN"
    assert state["sla_due_at"] is None

    state = compute_sla_state(None, "pothole", "high", "pending")
    assert state["sla_state"] == "UNKNOWN"


def test_naive_timestamp_is_treated_as_utc():
    naive = (datetime.now(timezone.utc) - timedelta(hours=1)).replace(tzinfo=None)
    state = compute_sla_state(naive.isoformat(), "pothole", "high", "pending")
    assert state["sla_state"] == "ON TRACK"
