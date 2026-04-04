from fastapi import APIRouter, Depends, HTTPException
from app.schemas.auth import SignupRequest, LoginRequest, AadharLoginRequest
import uuid
from app.core.database import get_supabase
from supabase import Client
from app.core.security import get_current_user

router = APIRouter()

@router.post("/signup")
async def signup(req: SignupRequest):
    db: Client = get_supabase()
    try:
        # Create user in Supabase Auth
        auth_res = db.auth.sign_up({
            "email": req.email,
            "password": req.password
        })
        
        if not auth_res.user:
            raise HTTPException(status_code=400, detail="Failed to create authentication account")
            
        user_id = auth_res.user.id
        
        # Insert profile into our 'users' table
        profile_data = {
            "id": user_id,
            "full_name": req.full_name,
            "email": req.email,
            "phone": req.phone,
            "role": req.role
        }
        
        db.table("users").insert(profile_data).execute()
        
        return {
            "success": True,
            "message": "User created successfully",
            "data": {
                "id": user_id,
                "email": req.email,
                "role": req.role
            }
        }
    except Exception as e:
        error_msg = str(e)
        if "already registered" in error_msg.lower():
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        raise HTTPException(status_code=500, detail=f"Registration failed: {error_msg}")

@router.post("/aadhar-login")
async def aadhar_login(req: AadharLoginRequest):
    db: Client = get_supabase()
    aadhar = req.aadhar_number.replace(" ", "")
    if len(aadhar) != 12 or not aadhar.isdigit():
        raise HTTPException(status_code=400, detail="Invalid Aadhar number format. Must be 12 digits.")

    # Generate a deterministic mock user ID from the Aadhar number
    mock_user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"aadhar-{aadhar}"))
    mock_full_name = f"Citizen {aadhar[:4]}...{aadhar[-2:]}"
    mock_address = f"House No. {aadhar[:3]}, Sector {aadhar[3:5]}, Springfield, IN"

    try:
        # Check if this mock citizen already exists in our users table
        existing = db.table("users").select("*").eq("id", mock_user_id).execute()

        if not existing.data:
            # First time — insert a profile row directly (no Supabase Auth needed)
            db.table("users").insert({
                "id": mock_user_id,
                "full_name": mock_full_name,
                "email": f"citizen-{aadhar[:4]}@jansamadhan.demo",
                "phone": f"+91{aadhar[:10]}",
                "role": "citizen"
            }).execute()
            profile_data = {"full_name": mock_full_name, "role": "citizen"}
        else:
            profile_data = existing.data[0]

        # Generate a mock access token (not a real JWT — the frontend only stores it)
        mock_token = f"mock_aadhar_token_{mock_user_id}"

        return {
            "success": True,
            "message": "Aadhar Login successful (Mock)",
            "data": {
                "access_token": mock_token,
                "user": {
                    "id": mock_user_id,
                    "full_name": profile_data.get("full_name", mock_full_name),
                    "role": profile_data.get("role", "citizen"),
                    "email": profile_data.get("email", f"citizen-{aadhar[:4]}@jansamadhan.demo"),
                    "address": mock_address,
                    "aadhar_number": aadhar
                }
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Aadhar mock login failed: {str(e)}")

@router.post("/login")
async def login(req: LoginRequest):
    db: Client = get_supabase()
    try:
        auth_res = db.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        
        if not auth_res.user or not auth_res.session:
            raise HTTPException(status_code=401, detail="Invalid email or password")
            
        # Fetch profile
        profile = db.table("users").select("*").eq("id", auth_res.user.id).single().execute()
        
        return {
            "success": True,
            "message": "Login successful",
            "data": {
                "access_token": auth_res.session.access_token,
                "user": {
                    "id": auth_res.user.id,
                    "full_name": profile.data.get("full_name"),
                    "role": profile.data.get("role")
                }
            }
        }
    except Exception as e:
        if "invalid login credentials" in str(e).lower():
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}")

@router.post("/logout")
def logout(user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "message": "Logout successful"
    }

@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "message": "User profile fetched",
        "data": {
            "id": user.get("id"),
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "role": user.get("role")
        }
    }

@router.get("/workers")
def get_workers(user: dict = Depends(get_current_user)):
    if user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Not authorized")
    db: Client = get_supabase()
    workers = db.table("users").select("id, full_name, department").eq("role", "worker").execute()
    
    worker_list = [{"id": w["id"], "full_name": w["full_name"], "department": w.get("department")} for w in workers.data]
    
    # Add high-quality mock data for demonstration
    mock_workers = [
        {"id": "mock-w1", "full_name": "Rajesh Kumar (Heavy Machinery)", "department": "Public Works (PWD)"},
        {"id": "mock-w2", "full_name": "Sunita Sharma (Drainage Expert)", "department": "Water Supply & Sanitation"},
        {"id": "mock-w3", "full_name": "Vikram Singh (Power Grid)", "department": "Electricity Board"},
        {"id": "mock-w4", "full_name": "Anita Desai (Waste Management)", "department": "Municipal Corporation"},
        {"id": "mock-w5", "full_name": "Ravi Patel (Tree Cutting Unit)", "department": "Parks & Recreation"},
        {"id": "mock-w6", "full_name": "Kiran Rao (Traffic Signals)", "department": "Traffic Police"}
    ]
    
    return {
        "success": True,
        "data": worker_list + mock_workers
    }

