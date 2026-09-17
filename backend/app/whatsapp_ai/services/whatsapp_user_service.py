import logging
import uuid

from supabase import Client

logger = logging.getLogger(__name__)

class WhatsAppUserService:
    """
    Handles identity management for WhatsApp users based on phone number.
    Ensures that WhatsApp users have a corresponding citizen record in the DB.
    """

    @staticmethod
    def get_or_create_citizen(db: Client, phone_number: str) -> str:
        """
        Looks up a citizen by phone number. If not found, creates a lightweight
        citizen record and returns the UUID.
        """
        try:
            # 1. Look for existing citizen by phone column (matches DB schema)
            res = db.table("users").select("id").eq("phone", phone_number).execute()
            if res.data and len(res.data) > 0:
                logger.info(f"Found existing citizen for phone {phone_number}")
                return res.data[0]["id"]
            
            # 2. If not found, create new citizen via Supabase Auth Admin first
            logger.info(f"Creating new Auth user for phone {phone_number}")
            
            # The public.users table (id) requires a foreign key to auth.users (id)
            # So we create the user in the Auth system first.
            auth_response = db.auth.admin.create_user({
                "email": f"{phone_number.replace('+', '')}@whatsapp.local",
                "phone": phone_number,
                "password": str(uuid.uuid4()) + "A1!", # random complex password
                "email_confirm": True,
                "phone_confirm": True,
                "user_metadata": {
                    "full_name": "WhatsApp User",
                    "role": "citizen"
                }
            })
            
            new_user_id = auth_response.user.id
            
            # 3. Insert into public.users
            # (Note: Some Supabase projects use a trigger to do this automatically. 
            # We catch exceptions just in case it already exists via trigger).
            insert_data = {
                "id": new_user_id,
                "phone": phone_number,
                "role": "citizen",
                "full_name": "WhatsApp User",
                "email": f"{phone_number.replace('+', '')}@whatsapp.local",
            }
            
            try:
                db.table("users").insert(insert_data).execute()
            except Exception as insert_e:
                error_str = str(insert_e).lower()
                # If a trigger already created the profile, or concurrent request hit it,
                # it might throw a duplicate key error. We can ignore that and just return the ID.
                if "duplicate key" not in error_str and "23505" not in error_str:
                    logger.warning(f"Non-fatal error inserting into public.users (trigger may have fired): {insert_e}")
                    
            return new_user_id
            
            
        except Exception as e:
            logger.error(f"Failed to get_or_create_citizen for {phone_number}: {e}")
            raise Exception(f"WhatsApp User Identity Error: {str(e)}") from e
