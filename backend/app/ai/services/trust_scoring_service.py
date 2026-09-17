import logging
from typing import Any

from app.core.database import get_supabase

logger = logging.getLogger(__name__)

class TrustScoringService:
    """
    Phase 4: AI Trust Rating.
    This service computes a trust score based on user history,
    using heuristics to reward resolved incidents and penalize rejected ones.
    """
    
    @classmethod
    async def process(cls, state: dict[str, Any]) -> dict[str, Any]:
        logger.info("🔧 [Phase 4] TrustScoringService running for Citizen...")
        user_id = state.get("citizen_id")
        
        # Default fallback
        if not user_id:
            return {"trust_score": 50, "is_verified": False}
        
        db = get_supabase()
        
        try:
            # Fetch user's incident history from DB
            res = db.table("incidents").select("status").eq("citizen_id", user_id).execute()
            history = res.data
            
            if not history:
                return {"trust_score": 50, "is_verified": False}
                
            base_score = 50
            resolved_count = 0
            rejected_count = 0
            
            for incident in history:
                if incident.get("status") == "resolved":
                    resolved_count += 1
                elif incident.get("status") == "rejected":
                    rejected_count += 1
            
            # Simple scoring metric: +10 for good reports, -15 for spam/rejected
            final_score = base_score + (resolved_count * 10) - (rejected_count * 15)
            
            # Clamp between 0 and 100
            final_score = max(0, min(100, final_score))
            
            is_verified = final_score >= 70
            
            logger.info(f"Trust Profile Computed -> Score: {final_score}, Verified: {is_verified}")
            
            # Update the user profile in DB with current trust score
            try:
                db.table("users").update({
                    "trust_score": final_score,
                    "is_verified": is_verified
                }).eq("id", user_id).execute()
            except Exception as update_err:
                logger.warning(f"Failed to save trust score to users table: {update_err}")

            # Record audit log in public.trust_scores table
            try:
                db.table("trust_scores").insert({
                    "entity_type": "citizen",
                    "entity_id": user_id,
                    "score": final_score,
                    "score_reason": f"Calculated from {resolved_count} resolved and {rejected_count} rejected reports",
                }).execute()
            except Exception as ts_err:
                logger.warning(f"Failed to save trust score history: {ts_err}")

            return {"trust_score": final_score, "is_verified": is_verified}
            
        except Exception as e:
            logger.error(f"Error in TrustScoringService: {e}")
            return {"trust_score": 50, "is_verified": False}
