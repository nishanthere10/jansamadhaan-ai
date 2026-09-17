import logging
from app.core.database import get_supabase
from app.ai.services.langgraph_pipeline import get_pipeline

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
            
            nodes = [
                ("transcribe", pipeline.graph_instance.transcriber if hasattr(pipeline, 'graph_instance') else None),
                ("vision_analysis", None),
                ("translate", None),
                ("classify", None),
                ("score_severity", None),
                ("route_department", None),
            ]
            
            # Re-create services and run them individually
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
                from app.ai.services.severity_scoring_service import SeverityScoringService
                result = SeverityScoringService().process(final_state)
                final_state.update(result)
                logger.info(f"[{incident_id}] Severity scoring completed")
            except Exception as e:
                logger.warning(f"[{incident_id}] Severity scoring failed: {e}")
                
            try:
                from app.ai.services.department_routing_service import DepartmentRoutingService
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
        cluster_meta = {}
        try:
            from app.ai.services.duplicate_detection_service import DuplicateDetectionService
            cluster_meta = await DuplicateDetectionService.process(final_state)
            logger.info(f"[{incident_id}] Duplicate detection completed: {cluster_meta}")
        except Exception as dup_err:
            logger.warning(f"[{incident_id}] Duplicate detection failed (non-fatal): {dup_err}")

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
            # priority_score column does not exist in schema — omitted
            "ai_confidence_score": 0.9,
            "ai_processing_status": ai_status,
            "ai_structured_data":  structured_data if structured_data else None,
        }

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

    except Exception as e:
        logger.exception(f"Failed AI Background Processing for {incident_id}: {str(e)}")
        # Try to save failure status to incident
        try:
            db.table("incidents").update({"ai_processing_status": "failed"}).eq("id", incident_id).execute()
        except Exception:
            pass
