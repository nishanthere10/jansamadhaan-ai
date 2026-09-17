import asyncio

from dotenv import load_dotenv

from app.core.database import get_supabase

load_dotenv()

async def seed():
    db = get_supabase()
    
    mock_workers = [
        {"email": "pwd@gov.in", "password": "password123", "full_name": "Rajesh Kumar (Heavy Machinery)", "department": "Public Works (PWD)"},
        {"email": "water@gov.in", "password": "password123", "full_name": "Sunita Sharma (Drainage Expert)", "department": "Water Supply & Sanitation"},
        {"email": "electric@gov.in", "password": "password123", "full_name": "Vikram Singh (Power Grid)", "department": "Electricity Board"},
    ]
    
    for w in mock_workers:
        try:
            print(f"Creating {w['email']}...")
            res = db.auth.sign_up({
                "email": w['email'],
                "password": w['password']
            })
            # Add small delay just in case limit is hit
            await asyncio.sleep(1)
            
            user_id = None
            if res.user:
                user_id = res.user.id
            else:
                # Let's try to query it if already registered
                print(f"Checking if {w['email']} already exists...")
                
            if user_id:
                profile_data = {
                    "id": user_id,
                    "full_name": w['full_name'],
                    "email": w['email'],
                    "phone": "9999999999",
                    "role": "worker",
                    "department": w["department"]
                }
                # Check if exists
                existing = db.table("users").select("id").eq("id", user_id).execute()
                if not existing.data:
                    db.table("users").insert(profile_data).execute()
                else:
                    db.table("users").update(profile_data).eq("id", user_id).execute()
                print(f"Success for {w['email']}")
        except Exception as e:
            print(f"Error for {w['email']}: {e}. Maybe already registered.")
            
if __name__ == "__main__":
    asyncio.run(seed())
