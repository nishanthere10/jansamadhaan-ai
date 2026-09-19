import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client, create_client

from app.core.config import settings
from app.core.database import get_supabase
from app.core.security import get_current_user, is_dev_bypass_enabled, issue_dev_session
from app.schemas.auth import AadharLoginRequest, LoginRequest, SignupRequest

logger = logging.getLogger(__name__)
router = APIRouter()

# Demo bench for local walkthroughs. Selecting one of these ids makes the status
# endpoint substitute a real worker, so exposing them outside development would
# let an authority assign an incident to a different worker than the one chosen.
MOCK_WORKERS = [
    {"id": "mock-w1", "full_name": "Rajesh Kumar (Heavy Machinery)", "department": "Public Works (PWD)"},
    {"id": "mock-w2", "full_name": "Sunita Sharma (Drainage Expert)", "department": "Water Supply & Sanitation"},
    {"id": "mock-w3", "full_name": "Vikram Singh (Power Grid)", "department": "Electricity Board"},
    {"id": "mock-w4", "full_name": "Anita Desai (Waste Management)", "department": "Municipal Corporation"},
    {"id": "mock-w5", "full_name": "Ravi Patel (Tree Cutting Unit)", "department": "Parks & Recreation"},
    {"id": "mock-w6", "full_name": "Kiran Rao (Traffic Signals)", "department": "Traffic Police"},
]

@router.post("/signup")
async def signup(req: SignupRequest):
    db: Client = get_supabase()
    requested_role = getattr(req, "role", None) or "citizen"
    logger.info(
        f"[Auth] Signup attempt initiated: email='{req.email}', full_name='{req.full_name}', "
        f"requested_role='{requested_role}'"
    )
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

        if not auth_res or not auth_res.user:
            logger.error(f"[Auth] Signup failed: Supabase returned empty user object for email='{req.email}'")
            raise HTTPException(status_code=400, detail="Failed to create authentication account")

        user_id = auth_res.user.id
        logger.info(f"[Auth] Supabase auth user provisioned: user_id='{user_id}' for email='{req.email}'")

        # Role assignment: for testing/development, honor requested role. In production, enforce citizen.
        valid_roles = {"citizen", "authority", "worker"}
        req_role = (getattr(req, "role", None) or "citizen").strip().lower()
        if settings.is_production:
            assigned_role = "citizen"
            if req_role != assigned_role:
                logger.info(
                    f"[Auth] Production policy: requested_role='{req_role}' enforced to 'citizen' for email='{req.email}'"
                )
        else:
            assigned_role = req_role if req_role in valid_roles else "citizen"
            logger.info(
                f"[Auth] Development/testing role policy: assigned_role='{assigned_role}' for email='{req.email}'"
            )

        profile_data = {
            "id": user_id,
            "full_name": req.full_name,
            "email": req.email,
            "phone": req.phone,
            "role": assigned_role,
        }
        if assigned_role == "authority" and not profile_data.get("department"):
            profile_data["department"] = "Municipal Administration"
        elif assigned_role == "worker" and not profile_data.get("department"):
            profile_data["department"] = "Public Works (PWD)"

        # Upsert into public.users table
        upsert_res = db.table("users").upsert(profile_data).execute()
        logger.info(f"[Auth] Profile upserted in public.users: user_id='{user_id}', email='{req.email}', role='{assigned_role}'")

        # Auto-confirm the user email so the account can log in immediately
        try:
            db.auth.admin.update_user_by_id(user_id, {"email_confirm": True})
            logger.info(f"[Auth] Email auto-confirmed for immediate login: user_id='{user_id}'")
        except Exception as conf_err:
            logger.warning(f"[Auth] Could not auto-confirm user email for {req.email}: {conf_err}")

        # Restore service role authorization on singleton client in case sign_up altered it
        if hasattr(db, "postgrest") and hasattr(settings, "SUPABASE_SERVICE_ROLE_KEY"):
            db.postgrest.auth(settings.SUPABASE_SERVICE_ROLE_KEY)

        logger.info(f"[Auth] Signup successfully completed: user_id='{user_id}', role='{assigned_role}'")
        return {
            "success": True,
            "message": "User created successfully. You can now sign in to the portal.",
            "data": {
                "id": user_id,
                "email": req.email,
                "role": assigned_role,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Auth] Signup encountered an unexpected exception for email='{req.email}'")
        error_msg = str(e)
        error_lower = error_msg.lower()

        if "users_phone_key" in error_lower or ("phone" in error_lower and "already exists" in error_lower):
            logger.warning(f"[Auth] Signup conflict: Phone number already exists for email='{req.email}'")
            raise HTTPException(status_code=400, detail="An account with this phone number already exists.") from e
        if "already registered" in error_lower or "user already exists" in error_lower:
            logger.warning(f"[Auth] Signup conflict: Email already registered for email='{req.email}'")
            raise HTTPException(status_code=400, detail="An account with this email already exists.") from e
        if "getaddrinfo failed" in error_lower or "connection" in error_lower or "network" in error_lower:
            logger.error(f"[Auth] Supabase network connectivity failure during signup for email='{req.email}'")
            raise HTTPException(
                status_code=503,
                detail="Cannot reach the authentication server. Please check your network or Supabase project URL.",
            ) from e
        raise HTTPException(status_code=500, detail=f"Registration failed: {error_msg}") from e

@router.post("/aadhar-login")
async def aadhar_login(req: AadharLoginRequest):
    # ── Hardening: the mock Aadhar flow mints a non-JWT token that can never
    # pass real verification. It is a development/demo convenience only.
    # Production (or any env without the explicit dev bypass) must refuse it
    # instead of creating a mock identity.
    if not is_dev_bypass_enabled():
        raise HTTPException(
            status_code=403,
            detail="Aadhar demo login is disabled. Use email/password authentication.",
        )
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

        mock_token = issue_dev_session({
            "id": mock_user_id,
            "full_name": profile_data.get("full_name", mock_full_name),
            "email": profile_data.get("email", f"citizen-{aadhar[:4]}@jansamadhan.demo"),
            "role": "citizen",
        })

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
    logger.info(f"[Auth] Login attempt received for email='{req.email}'")
    try:
        auth_res = db.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })

        if not auth_res or not auth_res.user or not auth_res.session:
            logger.warning(f"[Auth] Login rejected for email='{req.email}': empty auth session returned")
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Restore service role authorization on singleton client
        if hasattr(db, "postgrest") and hasattr(settings, "SUPABASE_SERVICE_ROLE_KEY"):
            db.postgrest.auth(settings.SUPABASE_SERVICE_ROLE_KEY)

        user_id = auth_res.user.id
        logger.info(f"[Auth] Credentials validated with Supabase: user_id='{user_id}', email='{req.email}'")

        # Fetch profile safely without throwing PGRST116
        profile_res = db.table("users").select("*").eq("id", user_id).execute()
        profile_data = profile_res.data[0] if profile_res.data else None

        # If user profile not in users table yet, create it on the fly
        if not profile_data:
            logger.info(f"[Auth] Profile not found in public.users for user_id='{user_id}'; auto-provisioning profile row")
            profile_data = {
                "id": user_id,
                "full_name": req.email.split("@")[0].capitalize(),
                "email": req.email,
                "role": "citizen"
            }
            try:
                db.table("users").insert(profile_data).execute()
                logger.info(f"[Auth] Auto-provisioned profile row inserted: user_id='{user_id}', role='citizen'")
            except Exception as ins_err:
                logger.warning(f"[Auth] Could not auto-create profile for {req.email}: {ins_err}")

        resolved_role = profile_data.get("role") or "citizen"
        resolved_name = profile_data.get("full_name") or req.email.split("@")[0]
        logger.info(
            f"[Auth] Login successful: user_id='{user_id}', email='{req.email}', "
            f"role='{resolved_role}', full_name='{resolved_name}'"
        )

        return {
            "success": True,
            "message": "Login successful",
            "data": {
                "access_token": auth_res.session.access_token,
                "user": {
                    "id": user_id,
                    "full_name": resolved_name,
                    "email": profile_data.get("email") or req.email,
                    "role": resolved_role,
                    "phone": profile_data.get("phone"),
                    "department": profile_data.get("department"),
                    "trust_score": profile_data.get("trust_score", 100),
                }
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        error_str = str(e).lower()
        if "invalid" in error_str or "credential" in error_str or "not found" in error_str:
            logger.warning(f"[Auth] Login rejected for email='{req.email}': invalid credentials")
            raise HTTPException(status_code=401, detail="Invalid email or password") from e
        if "email not confirmed" in error_str:
            logger.warning(f"[Auth] Login rejected for email='{req.email}': email not confirmed in Supabase")
            raise HTTPException(
                status_code=403, 
                detail="Email not confirmed. In Supabase Dashboard -> Authentication -> Providers -> Email, disable 'Confirm email' for local testing."
            ) from e
        if "getaddrinfo failed" in error_str or "connection" in error_str or "network" in error_str:
            logger.error(f"[Auth] Supabase network connectivity failure during login for email='{req.email}': {e}")
            raise HTTPException(
                status_code=503,
                detail="Cannot reach the authentication server. Please check your network or Supabase project URL.",
            ) from e
        logger.exception(f"[Auth] Unexpected login failure for email='{req.email}'")
        raise HTTPException(status_code=500, detail=f"Login failed: {str(e)}") from e

@router.post("/logout")
def logout(user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    email = user.get("email")
    logger.info(f"[Auth] User logged out: user_id='{user_id}', email='{email}'")
    return {
        "success": True,
        "message": "Logout successful"
    }

@router.get("/me")
def me(user: dict = Depends(get_current_user)):
    user_id = user.get("id")
    role = user.get("role")
    logger.debug(f"[Auth] Profile fetched via /me: user_id='{user_id}', role='{role}'")
    return {
        "success": True,
        "message": "User profile fetched",
        "data": {
            "id": user_id,
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "role": role
        }
    }

@router.get("/workers")
def get_workers(user: dict = Depends(get_current_user)):
    if user.get("role") != "authority":
        raise HTTPException(status_code=403, detail="Not authorized")
    db: Client = get_supabase()
    workers = db.table("users").select("id, full_name, department").eq("role", "worker").execute()
    
    # The demo bench is development-only. Production authorities must only ever
    # see registered worker accounts, because selecting a mock id makes the status
    # endpoint substitute a different, real worker.
    worker_list = [
        {"id": w["id"], "full_name": w["full_name"], "department": w.get("department")}
        for w in (workers.data or [])
    ]
    if not settings.is_production:
        worker_list += MOCK_WORKERS

    return {
        "success": True,
        "data": worker_list
    }

