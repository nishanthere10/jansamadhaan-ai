import logging

from app.ai.services.langgraph_pipeline import get_pipeline
from app.core.database import get_supabase
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

async def process_incident_ai_background(
    incident_id: str, 
    original_text: str, 
    audio_path: str = None, 
    image_url: str = None,
    location_lat: float = None,
    location_lng: float = None,
    address: str = None
):
    """
    Background wrapper to run the LangGraph pipeline non-blockingly.
    Updates the incidents table and adds a record to incident_ai_metadata.
    
    RESILIENT: Saves partial results even if individual nodes fail.
    """
    db = get_supabase()
    
    try:
        logger.info(f"Starting AI Pipeline for incident: {incident_id}")
        
        # Mark as processing
        db.table("incidents").update({"ai_processing_status": "processing"}).eq("id", incident_id).execute()
        
        # 1. State Definition
        initial_state = {
            "incident_id": incident_id,
            "original_text": original_text,
            "audio_path": audio_path,
            "image_url": image_url,
            "location_lat": location_lat,
            "location_lng": location_lng,
            "address": address,
            "keywords": [],
            "secondary_departments": []
        }

        # 2. Execute Graph — run each node individually so partial results are saved
        pipeline = get_pipeline()
        
        # Try the full pipeline first
        final_state = None
        try:
            final_state = await pipeline.ainvoke(initial_state)
        except Exception as pipe_err:
            logger.warning(f"Full pipeline failed for {incident_id}: {pipe_err}. Attempting node-by-node execution...")
            
            # Fallback: run each service individually, catching failures per-node
            final_state = dict(initial_state)
            
            try:
                from app.ai.services.transcription_service import TranscriptionService
                result = TranscriptionService().process(final_state)
                final_state.update(result)
                logger.info(f"[{incident_id}] Transcription completed")
            except Exception as e:
                logger.warning(f"[{incident_id}] Transcription failed: {e}")
                
            try:
                from app.ai.services.vision_service import VisionAnalysisService
                result = VisionAnalysisService().process(final_state)
                final_state.update(result)
                logger.info(f"[{incident_id}] Vision analysis completed")
            except Exception as e:
                logger.warning(f"[{incident_id}] Vision analysis failed: {e}")
            
            try:
                from app.ai.services.translation_service import TranslationService
                result = TranslationService().process(final_state)
                final_state.update(result)
                logger.info(f"[{incident_id}] Translation completed")
            except Exception as e:
                logger.warning(f"[{incident_id}] Translation failed: {e}")
                
            try:
                from app.ai.services.classification_service import ClassificationService
                result = ClassificationService().process(final_state)
                final_state.update(result)
                logger.info(f"[{incident_id}] Classification completed")
            except Exception as e:
                logger.warning(f"[{incident_id}] Classification failed: {e}")
                
            try:
                from app.ai.services.severity_scoring_service import (
                    SeverityScoringService,
                )
                result = SeverityScoringService().process(final_state)
                final_state.update(result)
                logger.info(f"[{incident_id}] Severity scoring completed")
            except Exception as e:
                logger.warning(f"[{incident_id}] Severity scoring failed: {e}")
                
            try:
                from app.ai.services.department_routing_service import (
                    DepartmentRoutingService,
                )
                result = DepartmentRoutingService().process(final_state)
                final_state.update(result)
                logger.info(f"[{incident_id}] Department routing completed")
            except Exception as e:
                logger.warning(f"[{incident_id}] Department routing failed: {e}")

        # 3. Determine status — "completed" if we got at least category OR severity
        has_results = bool(final_state.get("category") or final_state.get("severity") or final_state.get("vision_analysis"))
        ai_status = "completed" if has_results else "failed"

        # Compile structured data fields
        structured_data = final_state.get("structured_visionData", {})
        # The pipeline computes a 0.0-1.0 severity score; persist it instead of
        # discarding it. There is no priority_score column, so it lives in JSON.
        if final_state.get("severity_score") is not None:
            structured_data["severity_score"] = final_state.get("severity_score")
        if final_state.get("severity_explanation"):
            structured_data["severity_explanation"] = final_state.get("severity_explanation")
        if final_state.get("escalation_level"):
            structured_data["escalation_level"] = final_state.get("escalation_level")
        if final_state.get("secondary_departments"):
            structured_data["secondary_departments"] = final_state.get("secondary_departments")
        if final_state.get("is_spam"):
            structured_data["is_spam"] = True
            structured_data["spam_reason"] = final_state.get("spam_reason")
            structured_data["spam_score"] = final_state.get("spam_score")

        # ── Phase 3: Duplicate Detection & Clustering ────────────
        # Cluster metadata is persisted by DuplicateDetectionService itself;
        # it must also survive into the final incidents update so the
        # orchestration layer can never discard a computed cluster result.
        cluster_meta: dict = {}
        try:
            from app.ai.services.duplicate_detection_service import (
                DuplicateDetectionService,
            )
            cluster_meta = await DuplicateDetectionService.process(final_state)
            logger.info(f"[{incident_id}] Duplicate detection completed: {cluster_meta}")
        except Exception as dup_err:
            logger.warning(f"[{incident_id}] Duplicate detection failed (non-fatal): {dup_err}")

        if cluster_meta.get("cluster_id"):
            structured_data["cluster_match_score"] = cluster_meta.get("cluster_match_score", 0.0)
        if final_state.get("keywords"):
            structured_data["extracted_keywords"] = final_state["keywords"]

        # 4. Save ALL available results to Supabase (even partial)
        # NOTE: Only write columns that exist in the 'incidents' schema.
        incident_updates = {
            "original_text":       original_text,
            "translated_text":     final_state.get("translated_text"),
            "detected_language":   final_state.get("detected_language"),
            "transcript_text":     final_state.get("transcript"),
            "generated_title":     final_state.get("generated_title"),
            "generated_summary":   final_state.get("generated_summary"),
            "ai_vision_analysis":  final_state.get("vision_analysis"),
            "ai_category":         final_state.get("category"),
            "ai_severity":         final_state.get("severity"),
            "ai_department":       final_state.get("primary_department"),
            # priority_score is not a domain field; the real 0.0-1.0 value is
            # severity_score, persisted in ai_structured_data.
            "ai_confidence_score": 0.9,
            "ai_processing_status": ai_status,
            "ai_structured_data":  structured_data if structured_data else None,
        }

        if cluster_meta.get("cluster_id"):
            incident_updates.update({key: cluster_meta[key] for key in (
                "cluster_id", "is_primary_incident", "duplicate_count"
            )})

        # Normalize severity to valid enum {'low', 'medium', 'high', 'critical'}
        raw_sev = final_state.get("severity")
        norm_sev = None
        if raw_sev:
            clean_sev = str(raw_sev).lower().replace(" risk", "").strip()
            norm_sev = "critical" if clean_sev in ("emergency", "critical") else clean_sev
            if norm_sev not in ("low", "medium", "high", "critical"):
                norm_sev = "medium"

        # Also update the MAIN title and description columns with AI-enriched values
        # so the dashboard displays the AI-generated content instead of raw placeholders
        if final_state.get("generated_title"):
            incident_updates["title"] = final_state["generated_title"]
        if final_state.get("generated_summary"):
            incident_updates["description"] = final_state["generated_summary"]
        # Update the category from AI classification
        if final_state.get("category"):
            incident_updates["category"] = final_state["category"]
        # Update severity from AI scoring  
        if norm_sev:
            incident_updates["severity"] = norm_sev

        # If it's flagged as spam, set low priority in schema
        if final_state.get("is_spam"):
            incident_updates["severity"] = "low"
        
        # Remove None values to avoid overwriting existing data with nulls
        incident_updates = {k: v for k, v in incident_updates.items() if v is not None}
        incident_updates["ai_processing_status"] = ai_status  # Always set status
        
        db.table("incidents").update(incident_updates).eq("id", incident_id).execute()

        # Insert metadata table (isolated — missing table must not crash the pipeline)
        try:
            metadata_insert = {
                "incident_id": incident_id,
                "raw_input": original_text,
                "normalized_input": final_state.get("transcript") or original_text,
                "translated_output": final_state.get("translated_text"),
                "transcription_output": final_state.get("transcript"),
                "vision_analysis": final_state.get("vision_analysis"),
                "category_prediction": final_state.get("category"),
                "severity_prediction": final_state.get("severity"),
                "department_prediction": final_state.get("primary_department"),
                "extracted_keywords": final_state.get("keywords", [])
            }
            db.table("incident_ai_metadata").insert(metadata_insert).execute()
        except Exception as meta_err:
            logger.warning(f"Failed to insert AI metadata for {incident_id} (table may not exist): {meta_err}")

        logger.info(f"Successfully processed AI Pipeline for incident: {incident_id} (status={ai_status})")

        # Recipient notifications: only events someone can act on, never a
        # progress ping per pipeline stage. Best effort - a notification
        # problem must never fail an analysis that already persisted.
        try:
            lookup = (
                db.table("incidents")
                .select("citizen_id, tracking_id")
                .eq("id", incident_id)
                .execute()
            )
            row = (lookup.data or [{}])[0]
            citizen_id = row.get("citizen_id")
            label = row.get("tracking_id") or incident_id

            if citizen_id:
                try:
                    from app.ai.services.trust_scoring_service import (
                        TrustScoringService,
                    )
                    await TrustScoringService.process({"citizen_id": citizen_id})
                except Exception as trust_err:
                    logger.warning(f"Failed to update trust score for {citizen_id}: {trust_err}")

            if ai_status == "completed" and citizen_id and final_state.get("category"):
                routing = final_state.get("primary_department") or "the concerned department"
                NotificationService.create_notification(
                    db,
                    citizen_id,
                    "Complaint Analysed",
                    f"Your complaint was classified as '{final_state['category']}' "
                    f"and routed to {routing}.",
                )
            elif ai_status == "failed":
                # A citizen cannot act on a pipeline failure; an authority can.
                NotificationService.notify_authorities(
                    db,
                    "AI Processing Failed",
                    f"AI analysis failed for incident {label}. "
                    f"A manual reprocess is required.",
                )

            if (
                cluster_meta.get("cluster_id")
                and cluster_meta.get("is_primary_incident") is False
                and citizen_id
            ):
                # Only the reporter of the duplicate is told; the primary's
                # citizen is not pinged again for every new duplicate.
                NotificationService.create_notification(
                    db,
                    citizen_id,
                    "Report Linked to an Existing Complaint",
                    f"Your report {label} matches an existing complaint and was "
                    f"linked to cluster {cluster_meta['cluster_id']}.",
                )
        except Exception as notify_err:
            logger.warning(f"Notification or Trust Scoring step failed for {incident_id}: {notify_err}")

    except Exception as e:
        logger.exception(f"Failed AI Background Processing for {incident_id}: {str(e)}")
        # Try to save failure status to incident
        try:
            db.table("incidents").update({"ai_processing_status": "failed"}).eq("id", incident_id).execute()
        except Exception:
            pass
