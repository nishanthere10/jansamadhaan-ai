import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('backend/.env')

supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
db = create_client(supabase_url, supabase_key)

res = db.table("incidents").select("id, title, ai_processing_status, ai_category, ai_severity, ai_vision_analysis").order("created_at", desc=True).limit(3).execute()
with open("test_out.json", "w") as f:
    json.dump(res.data, f, indent=2)
