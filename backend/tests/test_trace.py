"""
Deep diagnostic: trace the entire AI pipeline step by step, 
then verify what gets written to Supabase.
"""
import os, sys, json, traceback
from dotenv import load_dotenv

load_dotenv('backend/.env')
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from supabase import create_client

# Get the most recent incident
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
db = create_client(url, key)

res = db.table('incidents').select('*').order('created_at', desc=True).limit(1).execute()
inc = res.data[0]
print("=" * 60)
print("STEP 0: LATEST INCIDENT FROM DB")
print("=" * 60)
for k in ['id', 'description', 'image_url', 'ai_processing_status', 'ai_category', 'ai_severity', 'ai_department', 'ai_vision_analysis', 'generated_title', 'generated_summary', 'translated_text', 'original_text']:
    print(f"  {k}: {inc.get(k)}")

incident_id = inc['id']
description = inc.get('description', '')
image_url = inc.get('image_url', '')

print("\n" + "=" * 60)
print("STEP 1: RUNNING VISION SERVICE")
print("=" * 60)
try:
    from app.ai.services.vision_service import VisionAnalysisService
    vs = VisionAnalysisService()
    vision_result = vs.process({"image_url": image_url})
    print(f"  Result: {json.dumps(vision_result, indent=2)}")
except Exception as e:
    vision_result = {"vision_analysis": None}
    print(f"  ERROR: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("STEP 2: RUNNING TRANSLATION SERVICE")
print("=" * 60)
try:
    from app.ai.services.translation_service import TranslationService
    ts = TranslationService()
    trans_result = ts.process({"original_text": description})
    print(f"  Result: {json.dumps(trans_result, indent=2)}")
except Exception as e:
    trans_result = {"translated_text": description, "detected_language": "en"}
    print(f"  ERROR: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("STEP 3: RUNNING CLASSIFICATION SERVICE")
print("=" * 60)
try:
    from app.ai.services.classification_service import ClassificationService
    cs = ClassificationService()
    class_result = cs.process({
        "translated_text": trans_result.get("translated_text") or description,
        "original_text": description,
        "vision_analysis": vision_result.get("vision_analysis")
    })
    print(f"  Result: {json.dumps(class_result, indent=2)}")
except Exception as e:
    class_result = {}
    print(f"  ERROR: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("STEP 4: RUNNING SEVERITY SERVICE")
print("=" * 60)
try:
    from app.ai.services.severity_scoring_service import SeverityScoringService
    ss = SeverityScoringService()
    sev_result = ss.process({
        "translated_text": trans_result.get("translated_text") or description,
        "original_text": description
    })
    print(f"  Result: {json.dumps(sev_result, indent=2)}")
except Exception as e:
    sev_result = {}
    print(f"  ERROR: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("STEP 5: RUNNING DEPARTMENT ROUTING SERVICE")
print("=" * 60)
try:
    from app.ai.services.department_routing_service import DepartmentRoutingService
    dr = DepartmentRoutingService()
    dept_result = dr.process({
        "translated_text": trans_result.get("translated_text") or description,
        "original_text": description,
        "category": class_result.get("category", "Unknown"),
        "severity": sev_result.get("severity", "Unknown")
    })
    print(f"  Result: {json.dumps(dept_result, indent=2)}")
except Exception as e:
    dept_result = {}
    print(f"  ERROR: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("STEP 6: WRITING TO SUPABASE")
print("=" * 60)
update_payload = {
    "original_text": description,
    "translated_text": trans_result.get("translated_text"),
    "detected_language": trans_result.get("detected_language"),
    "generated_title": class_result.get("generated_title"),
    "generated_summary": class_result.get("generated_summary"),
    "ai_vision_analysis": vision_result.get("vision_analysis"),
    "ai_category": class_result.get("category"),
    "ai_severity": sev_result.get("severity"),
    "ai_department": dept_result.get("primary_department"),
    "ai_confidence_score": 0.9,
    "ai_processing_status": "completed"
}
print(f"  Payload: {json.dumps(update_payload, indent=2)}")

try:
    write_res = db.table("incidents").update(update_payload).eq("id", incident_id).execute()
    print(f"  Write success! Rows affected: {len(write_res.data)}")
except Exception as e:
    print(f"  WRITE ERROR: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("STEP 7: VERIFY - RE-READ FROM DB")
print("=" * 60)
verify = db.table('incidents').select('*').eq('id', incident_id).execute()
v = verify.data[0]
for k in ['ai_processing_status', 'ai_category', 'ai_severity', 'ai_department', 'ai_vision_analysis', 'generated_title', 'generated_summary', 'translated_text']:
    print(f"  {k}: {v.get(k)}")

print("\n✅ DONE! All steps traced.")
