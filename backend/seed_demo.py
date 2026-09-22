import asyncio
import random
from datetime import datetime, timedelta

from dotenv import load_dotenv

from app.core.database import get_supabase

load_dotenv()

async def seed_demo():
    db = get_supabase()
    
    # 1. Ensure we have some test users (Citizen, Worker)
    print("Checking for demo users...")
    demo_citizen_id = "00000000-0000-0000-0000-000000000001" # Mock UUID for citizen
    demo_worker_id = "00000000-0000-0000-0000-000000000002" # Mock UUID for worker
    
    # In a real environment, we should fetch actual user IDs or create them.
    # For now, we will query existing workers from seed_workers.py.
    workers = db.table("users").select("id").eq("role", "worker").execute()
    if workers.data:
        worker_id = workers.data[0]['id']
    else:
        print("No workers found. Please run seed_workers.py first.")
        worker_id = demo_worker_id
        
    citizens = db.table("users").select("id").eq("role", "citizen").execute()
    if citizens.data:
        citizen_id = citizens.data[0]['id']
    else:
        citizen_id = demo_citizen_id

    # 2. Generate Deterministic 40-60 incidents
    print("Generating deterministic demo data...")
    locations = [
        {"address": "Koramangala 4th Block, 80ft Road", "lat": 12.934, "lng": 77.625},
        {"address": "Koramangala 1st Block, Near Water Tank", "lat": 12.927, "lng": 77.633},
        {"address": "Indiranagar 100ft Road, Metro Station", "lat": 12.978, "lng": 77.638},
        {"address": "Indiranagar 12th Main", "lat": 12.971, "lng": 77.641},
        {"address": "HSR Layout Sector 2", "lat": 12.908, "lng": 77.647},
        {"address": "HSR Layout Sector 4, Agara Lake", "lat": 12.919, "lng": 77.643},
    ]

    categories = [
        ("pothole", "Huge crater causing severe traffic delay", "Public Works"),
        ("water-leakage", "Underground pipe burst, street flooded", "Water Supply"),
        ("broken-streetlight", "Entire street is dark, safety hazard", "Electricity Board"),
        ("garbage", "Overflowing bins for 4 days, smell is unbearable", "Sanitation"),
    ]

    incidents = []
    
    for i in range(45):
        loc = random.choice(locations)
        cat = random.choice(categories)
        status = random.choices(
            ["pending", "assigned", "in-progress", "resolved"],
            weights=[30, 20, 20, 30]
        )[0]
        
        assigned_to = worker_id if status in ["assigned", "in-progress", "resolved"] else None
        
        incidents.append({
            "title": f"{cat[0].title()} near {loc['address'].split(',')[0]}",
            "description": cat[1],
            "category": cat[0],
            "status": status,
            "severity": random.choices(["low", "medium", "high", "critical"], weights=[20, 40, 30, 10])[0],
            "location_lat": loc["lat"] + random.uniform(-0.005, 0.005),
            "location_lng": loc["lng"] + random.uniform(-0.005, 0.005),
            "address": loc["address"],
            "citizen_id": citizen_id,
            "ai_department": cat[2],
            "assigned_to": assigned_to,
            "tracking_id": f"CIV-2026-DEMO-{i:03d}",
            "created_at": (datetime.now() - timedelta(days=random.randint(1, 14))).isoformat()
        })

    print(f"Inserting {len(incidents)} demo incidents...")
    for inc in incidents:
        try:
            db.table("incidents").insert(inc).execute()
        except Exception as e:
            print(f"Failed to insert incident {inc['tracking_id']}: {e}")

    print("Demo data seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_demo())
