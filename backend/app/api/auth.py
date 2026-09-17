import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client

from app.core.database import get_supabase
from app.core.security import get_current_user
from app.schemas.auth import AadharLoginRequest, LoginRequest, SignupRequest

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/signup")
async def signup(req: SignupRequest):
    db: Client = get_supabase()
    try:
        # supabase-py v2: sign_up accepts a plain dict with email/password
        # options.data holds user_metadata (stored on the auth.users row)
        auth_res = db.auth.sign_up({
            "email": req.email,
            "password": req.password,
            "options": {
                "data": {
                    "full_name": req.full_name,
                    "phone": req.phone,
                }
            }
        })

        if not auth_res.user:
            raise HTTPException(status_code=400, detail="Failed to create authentication account")

        user_id = auth_res.user.id

        # Force citizen role for public self-registration (prevent privilege escalation)
        profile_data = {
            "id": user_id,
            "full_name": req.full_name,
            "email": req.email,
            "phone": req.phone,
            "role": "citizen",
        }

        # Upsert into public.users table
        upsert_res = db.table("users").upsert(profile_data).execute()
        logger.info(f"Profile upserted for {req.email}: {upsert_res.data}")

        return {
            "success": True,
            "message": "User created successfully. Please check your email to confirm your account.",
            "data": {
                "id": user_id,
                "email": req.email,
                "role": "citizen",
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Signup failed for {req.email}")
        error_msg = str(e)
        error_lower = error_msg.lower()

        if "already registered" in error_lower or "user already exists" in error_lower:
            raise HTTPException(status_code=400, detail="An account with this email already exists.") from e
        if "getaddrinfo failed" in error_lower or "connection" in error_lower or "network" in error_lower:
            raise HTTPException(
                status_code=503,
                detail="Cannot reach the authentication server. Please check your network or Supabase project URL.",
            ) from e
        raise HTTPException(status_code=500, detail=f"Registration failed: {error_msg}") from e

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
            mock_email = f"citizen-{aadhar[:4]}@jansamadhan.demo"
            # Public.users(id) references auth.users(id) via foreign key.
            # Create the auth user first to satisfy the FK constraint.
            try:
                auth_res = db.auth.admin.create_user({
                    "id": mock_user_id,
                    "email": mock_email,
                    "password": f"AadharPass@{aadhar[:6]}#",
                    "email_confirm": True,
                    "user_metadata": {"full_name": mock_full_name, "role": "citizen"}
                })
                if auth_res and auth_res.user:
                    mock_user_id = auth_res.user.id
            except Exception as auth_err:
                logger.warning(f"Could not provision auth.users row for Aadhar user: {auth_err}")

            try:
                db.table("users").insert({
                    "id": mock_user_id,
                    "full_name": mock_full_name,
                    "email": mock_email,
                    "phone": f"+91{aadhar[:10]}",
                    "role": "citizen"
                }).execute()
            except Exception as ins_err:
                logger.warning(f"Could not insert Aadhar citizen into public.users: {ins_err}")

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
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Aadhar login failed")
        raise HTTPException(status_code=500, detail=f"Aadhar mock login failed: {str(e)}") from e

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
            
        # Fetch profile safely without throwing PGRST116
        profile_res = db.table("users").select("*").eq("id", auth_res.user.id).execute()
        profile_data = profile_res.data[0] if profile_res.data else None
        
        # If user profile not in users table yet, create it on the fly
        if not profile_data:
            profile_data = {
                "id": auth_res.user.id,
                "full_name": req.email.split("@")[0].capitalize(),
                "email": req.email,
                "role": "authority" if ("gov" in req.email or "admin" in req.email) else "citizen"
            }
            try:
                db.table("users").insert(profile_data).execute()
            except Exception as ins_err:
                logger.warning(f"Could not auto-create profile for {req.email}: {ins_err}")

        return {
            "success": True,
            "message": "Login successful",
            "data": {
                "access_token": auth_res.session.access_token,
                "user": {
                    "id": auth_res.user.id,
                    "full_name": profile_data.get("full_name") or req.email.split("@")[0],
                    "role": profile_data.get("role") or "citizen"
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Login failed for {req.email}")
        error_str = str(e).lower()
        if "invalid" in error_str or "credential" in error_str or "not found" in error_str:
            raise HTTPException(status_code=401, detail="Invalid email or password") from e
        if "email not confirmed" in error_str:
            raise HTTPException(
                status_code=403, 
                detail="Email not confirmed. In Supabase Dashboard -> Authentication -> Providers -> Email, disable 'Confirm email' for local testing."
            ) from e
        if "getaddrinfo failed" in error_str or "connection" in error_str or "network" in error_str:
            raise HTTPException(
                status_code=503,
                detail="Cannot reach the authentication server. Please check your network or Supabase project URL.",
            ) from e
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}") from e

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

