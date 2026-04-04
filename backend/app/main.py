import os
import logging
from dotenv import load_dotenv
load_dotenv()  # Load .env file

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, incident, qr_projects, ai, notifications
# ── Configure logging ─────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="CivicResponse AI",
    description="Backend API for CivicResponse AI — WhatsApp-first civic grievance platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Read allowed origins from env, defaulting to local dev port
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.whatsapp_ai.controllers import whatsapp_webhook_controller

app.include_router(auth.router,         prefix="/api/v1/auth",        tags=["Auth"])
app.include_router(incident.router,     prefix="/api/v1/incidents",   tags=["Incidents"])
app.include_router(qr_projects.router,  prefix="/api/v1/qr-projects", tags=["QR Projects"])
app.include_router(ai.router,           prefix="/api/v1/ai",          tags=["AI Operations"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(whatsapp_webhook_controller.router, prefix="/api/webhooks/whatsapp", tags=["WhatsApp"])

# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "CivicResponse AI backend is running"}

logger.warning("⚠️ CORS allow_origins is ['*']. Restrict before production deployment.")
logger.info("CivicResponse AI backend started ✓")
