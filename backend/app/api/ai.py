from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user

router = APIRouter()

class TranslateRequest(BaseModel):
    text: str

class ClassifyRequest(BaseModel):
    text: str

# ── Standalone AI Testing Endpoints ──────────────────────────────────────────

@router.post("/translate")
async def test_translate(req: TranslateRequest, user: dict = Depends(get_current_user)):
    """Standalone Translation Endpoint for Phase 2 Testing"""
    if user["role"] not in ("authority", "worker"):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    from app.ai.services.translation_service import TranslationService
    svc = TranslationService()
    state = {"original_text": req.text}
    return svc.process(state)

@router.post("/classify")
async def test_classify(req: ClassifyRequest, user: dict = Depends(get_current_user)):
    """Standalone Classification Endpoint for Phase 2 Testing"""
    # Allow citizens to use this for the pre-submit AI classification feature
    from app.ai.services.classification_service import ClassificationService
    svc = ClassificationService()
    state = {"original_text": req.text}
    return svc.process(state)
