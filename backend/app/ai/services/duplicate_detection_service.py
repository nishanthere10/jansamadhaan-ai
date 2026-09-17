"""
Phase 3: Duplicate Detection & Incident Clustering Service
-----------------------------------------------------------
Detects whether a new complaint matches an existing open incident
based on category, department, geographic proximity, and recency.

If a match is found, the new incident is linked to an existing cluster.
If not, a new standalone cluster is created.
"""

import logging
import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.database import get_supabase

logger = logging.getLogger(__name__)

# ── Tuning Constants ─────────────────────────────────────────
MATCH_WINDOW_DAYS = 5          # Only look at incidents from the last N days
GEO_RADIUS_METERS = 500        # Max distance to consider a geographic match
MATCH_THRESHOLD = 0.60         # Minimum combined score to declare a duplicate
KEYWORD_WEIGHT = 0.25
GEO_WEIGHT = 0.45
CATEGORY_WEIGHT = 0.30

# ── Cluster Severity Escalation ──────────────────────────────
ESCALATION_MAP = {
    1: "Low Risk",
    3: "Medium Risk",
    5: "High Risk",
    10: "Emergency",
}


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return the great-circle distance in metres between two points."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _geo_score(dist_m: float) -> float:
    """Map distance in metres to a 0-1 similarity score."""
    if dist_m <= 100:
        return 1.0
    if dist_m <= 250:
        return 0.8
    if dist_m <= 500:
        return 0.5
    return 0.0


def _keyword_overlap(kw_a: list[str], kw_b: list[str]) -> float:
    """Jaccard-like overlap of two keyword lists."""
    if not kw_a or not kw_b:
        return 0.0
    set_a = {k.lower().strip() for k in kw_a}
    set_b = {k.lower().strip() for k in kw_b}
    intersection = set_a & set_b
    union = set_a | set_b
    return len(intersection) / len(union) if union else 0.0


def _escalated_severity(duplicate_count: int) -> str:
    """Given a duplicate count, return the appropriate escalated severity string."""
    severity = "Low Risk"
    for threshold, label in sorted(ESCALATION_MAP.items()):
        if duplicate_count + 1 >= threshold:  # +1 because we include the primary
            severity = label
    return severity


class DuplicateDetectionService:
    """
    Lightweight duplicate / cluster detection service.
    Called *after* AI classification & severity scoring finish.
    """

    @classmethod
    async def process(cls, state: dict[str, Any]) -> dict[str, Any]:
        """
        Main entry point. Receives the pipeline state dict.
        Returns updated state dict with cluster metadata.
        """
        incident_id: str = state.get("incident_id", "")
        category: str | None = state.get("category")
        department: str | None = state.get("primary_department")
        lat: float | None = state.get("location_lat")
        lng: float | None = state.get("location_lng")
        keywords: list[str] = state.get("keywords", [])

        logger.info(f"[DuplicateDetection] Starting for incident {incident_id}")

        # Pre-flight: verify cluster columns exist in DB (migration may not have run)
        if not await cls._columns_exist():
            logger.warning("[DuplicateDetection] Cluster columns not found in DB. Skipping. Run the SQL migration first.")
            return {
                "cluster_id": None,
                "is_primary_incident": False,
                "duplicate_count": 0,
                "cluster_match_score": 0.0,
            }

        # If no category or location, we can't do meaningful matching → standalone
        if not category or lat is None or lng is None:
            logger.info(f"[DuplicateDetection] Insufficient data for matching (cat={category}, lat={lat}, lng={lng}). Creating standalone cluster.")
            cluster_id = str(uuid.uuid4())
            await cls._save_cluster_standalone(incident_id, cluster_id)
            return {
                "cluster_id": cluster_id,
                "is_primary_incident": True,
                "duplicate_count": 0,
                "cluster_match_score": 0.0,
            }

        # 1. Fetch candidates from DB
        candidates = await cls._fetch_candidates(incident_id, category, department)
        logger.info(f"[DuplicateDetection] Found {len(candidates)} candidate(s) in DB")

        # 2. Score each candidate
        best_match: dict[str, Any] | None = None
        best_score: float = 0.0

        for cand in candidates:
            score = cls._calculate_similarity(
                new_lat=lat,
                new_lng=lng,
                new_category=category,
                new_keywords=keywords,
                candidate=cand,
            )
            if score > best_score:
                best_score = score
                best_match = cand

        # 3. Decide: merge or standalone
        if best_match and best_score >= MATCH_THRESHOLD:
            cluster_id = best_match.get("cluster_id") or str(uuid.uuid4())
            primary_id = best_match.get("id")
            new_dup_count = (best_match.get("duplicate_count") or 0) + 1

            logger.info(
                f"[DuplicateDetection] MATCH FOUND — score={best_score:.2f}, "
                f"primary={primary_id}, cluster={cluster_id}, new_dup_count={new_dup_count}"
            )

            await cls._attach_to_cluster(
                incident_id=incident_id,
                cluster_id=cluster_id,
                primary_id=primary_id,
                new_dup_count=new_dup_count,
            )
            return {
                "cluster_id": cluster_id,
                "is_primary_incident": False,
                "duplicate_count": 0,
                "cluster_match_score": best_score,
                "merged_into_incident_id": primary_id,
            }
        else:
            cluster_id = str(uuid.uuid4())
            logger.info(
                f"[DuplicateDetection] No match (best_score={best_score:.2f}). Creating standalone cluster {cluster_id}"
            )
            await cls._save_cluster_standalone(incident_id, cluster_id)
            return {
                "cluster_id": cluster_id,
                "is_primary_incident": True,
                "duplicate_count": 0,
                "cluster_match_score": best_score,
            }

    # ── Private Helpers ──────────────────────────────────────

    @staticmethod
    async def _columns_exist() -> bool:
        """Check if cluster columns exist in the incidents table (migration may not have run)."""
        db = get_supabase()
        try:
            # Try selecting the cluster_id column — if it doesn't exist, Supabase will error
            db.table("incidents").select("cluster_id").limit(1).execute()
            return True
        except Exception:
            return False

    @staticmethod
    async def _fetch_candidates(
        exclude_id: str,
        category: str,
        department: str | None,
    ) -> list[dict[str, Any]]:
        """
        Query Supabase for recent, unresolved incidents with the same category.
        """
        db = get_supabase()
        cutoff = (datetime.now(timezone.utc) - timedelta(days=MATCH_WINDOW_DAYS)).isoformat()

        try:
            query = (
                db.table("incidents")
                .select(
                    "id, cluster_id, is_primary_incident, duplicate_count, "
                    "ai_category, category, ai_department, "
                    "location_lat, location_lng, ai_structured_data"
                )
                .neq("id", exclude_id)
                .neq("status", "resolved")
                .neq("status", "rejected")
                .gte("created_at", cutoff)
            )

            # Filter by category match (try ai_category first, fallback to category)
            # We use 'or' filter for flexibility
            query = query.or_(
                f"ai_category.ilike.%{category}%,category.ilike.%{category}%"
            )

            result = query.execute()
            return result.data or []
        except Exception as e:
            logger.error(f"[DuplicateDetection] Failed to query candidates: {e}")
            return []

    @staticmethod
    def _calculate_similarity(
        new_lat: float,
        new_lng: float,
        new_category: str,
        new_keywords: list[str],
        candidate: dict[str, Any],
    ) -> float:
        """
        Composite similarity score between a new incident and a candidate.
        """
        # A. Geographic similarity
        cand_lat = candidate.get("location_lat")
        cand_lng = candidate.get("location_lng")
        geo = 0.0
        if cand_lat is not None and cand_lng is not None:
            dist = _haversine_meters(new_lat, new_lng, cand_lat, cand_lng)
            geo = _geo_score(dist)

        # B. Category match
        cand_cat = (candidate.get("ai_category") or candidate.get("category") or "").lower()
        cat_match = 1.0 if new_category.lower() in cand_cat or cand_cat in new_category.lower() else 0.0

        # C. Keyword overlap (from structured data if available)
        cand_keywords: list[str] = []
        structured = candidate.get("ai_structured_data")
        if isinstance(structured, dict):
            cand_keywords = structured.get("extracted_keywords", [])
            if not cand_keywords:
                objs = structured.get("objects_detected", [])
                cand_keywords = objs
        kw_score = _keyword_overlap(new_keywords, cand_keywords)

        # D. Weighted composite
        total = (geo * GEO_WEIGHT) + (cat_match * CATEGORY_WEIGHT) + (kw_score * KEYWORD_WEIGHT)
        return total

    @staticmethod
    async def _save_cluster_standalone(incident_id: str, cluster_id: str) -> None:
        """Mark an incident as a new standalone cluster."""
        db = get_supabase()
        try:
            db.table("incidents").update({
                "cluster_id": cluster_id,
                "is_primary_incident": True,
                "duplicate_count": 0,
            }).eq("id", incident_id).execute()
        except Exception as e:
            logger.warning(f"[DuplicateDetection] Failed to save standalone cluster for {incident_id}: {e}")

    @classmethod
    async def _attach_to_cluster(
        cls,
        incident_id: str,
        cluster_id: str,
        primary_id: str,
        new_dup_count: int,
    ) -> None:
        """Attach a new incident to an existing cluster and escalate severity."""
        db = get_supabase()
        try:
            # 1. Update the NEW incident — it's a duplicate
            db.table("incidents").update({
                "cluster_id": cluster_id,
                "is_primary_incident": False,
                "duplicate_count": 0,
            }).eq("id", incident_id).execute()

            # 2. Update the PRIMARY incident — bump its duplicate count
            escalated_severity = _escalated_severity(new_dup_count)

            primary_updates: dict[str, Any] = {
                "duplicate_count": new_dup_count,
                "cluster_id": cluster_id,
                "is_primary_incident": True,
            }

            # Only escalate severity upward, never downward
            severity_order = ["Low Risk", "Medium Risk", "High Risk", "Emergency"]
            # Fetch current severity to check if we should escalate
            try:
                current = db.table("incidents").select("ai_severity").eq("id", primary_id).execute()
                current_sev = (current.data[0].get("ai_severity") or "Low Risk") if current.data else "Low Risk"
                current_idx = severity_order.index(current_sev) if current_sev in severity_order else 0
                new_idx = severity_order.index(escalated_severity) if escalated_severity in severity_order else 0
                if new_idx > current_idx:
                    primary_updates["ai_severity"] = escalated_severity
                    clean_esc = escalated_severity.lower().replace(" risk", "").strip()
                    norm_esc = "critical" if clean_esc in ("emergency", "critical") else clean_esc
                    primary_updates["severity"] = norm_esc
                    logger.info(f"[DuplicateDetection] Escalating primary {primary_id} severity to {escalated_severity} ({norm_esc})")
            except Exception as esc_err:
                logger.warning(f"[DuplicateDetection] Severity escalation check fallback: {esc_err}")
                primary_updates["ai_severity"] = escalated_severity

            db.table("incidents").update(primary_updates).eq("id", primary_id).execute()

            # 3. Record duplicate link in public.duplicate_complaints table
            try:
                db.table("duplicate_complaints").insert({
                    "incident_id": primary_id,
                    "duplicate_incident_id": incident_id,
                    "similarity_score": 0.85,
                    "detection_reason": f"AI cluster match attached to primary incident {primary_id}",
                }).execute()
            except Exception as dup_table_err:
                logger.warning(f"[DuplicateDetection] Could not insert into duplicate_complaints: {dup_table_err}")

            logger.info(
                f"[DuplicateDetection] Attached {incident_id} to cluster {cluster_id} "
                f"(primary={primary_id}, dup_count={new_dup_count})"
            )
        except Exception as e:
            logger.error(f"[DuplicateDetection] Failed to attach to cluster: {e}")
