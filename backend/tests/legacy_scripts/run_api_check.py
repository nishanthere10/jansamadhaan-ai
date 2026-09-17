import os
import requests
from dotenv import load_dotenv

load_dotenv('backend/.env')

# Login to get a token
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_ANON_KEY')

res = requests.post(
    f"{supabase_url}/auth/v1/token?grant_type=password",
    headers={"apikey": supabase_key, "Content-Type": "application/json"},
    json={"email": "authority@civicresponse.com", "password": "password123"}
)
token = res.json().get("access_token")

# Call the API
api_res = requests.get(
    "http://127.0.0.1:8000/api/v1/incidents",
    headers={"Authorization": f"Bearer {token}"}
)

incidents = api_res.json().get("data", [])
if incidents:
    latest = incidents[0]
    print(f"ID: {latest['id']}")
    print(f"ai_category: {latest.get('ai_category')}")
    print(f"ai_severity: {latest.get('ai_severity')}")
    print(f"ai_vision_analysis: {latest.get('ai_vision_analysis')}")
    print(f"Keys present: {list(latest.keys())}")
else:
    print("No incidents found")
