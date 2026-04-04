from fastapi import Header, HTTPException, Depends
from app.core.database import get_supabase
from supabase import Client

def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")
    
    token = authorization.split(" ")[1]
    db = get_supabase()
    
    try:
        user_response = db.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="User not found")
        
        # User is authenticated via Supabase
        # Now fetch user profile from our "users" table
        profile_res = db.table("users").select("*").eq("id", user_response.user.id).single().execute()
        
        if not profile_res.data:
            raise HTTPException(status_code=401, detail="User profile not found in database")
            
        return profile_res.data
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
