import os
from dotenv import load_dotenv

# ── Load .env FIRST before any app module is imported ─────────────────────────
load_dotenv()

from app.core.logging_config import configure_logging
from app.core.config import settings

# Configure structured logging immediately after env is loaded
configure_logging(
    level="DEBUG" if settings.ENVIRONMENT == "development" else "INFO",
    dev=(settings.ENVIRONMENT == "development"),
)

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.middleware import RequestLoggingMiddleware
from app.api import auth, incident, qr_projects, ai, notifications

logger = logging.getLogger(__name__)

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Jan Samadhan AI",
    description="Backend API for Jan Samadhan AI — AI-powered public grievance platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── Middleware (order matters: outer-most first) ───────────────────────────────
app.add_middleware(RequestLoggingMiddleware)

allowed_origins = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.whatsapp_ai.controllers import whatsapp_webhook_controller

app.include_router(auth.router,          prefix="/api/v1/auth",           tags=["Auth"])
app.include_router(incident.router,      prefix="/api/v1/incidents",      tags=["Incidents"])
app.include_router(qr_projects.router,   prefix="/api/v1/qr-projects",    tags=["QR Projects"])
app.include_router(ai.router,            prefix="/api/v1/ai",             tags=["AI Operations"])
app.include_router(notifications.router, prefix="/api/v1/notifications",  tags=["Notifications"])
app.include_router(
    whatsapp_webhook_controller.router,
    prefix="/api/webhooks/whatsapp",
    tags=["WhatsApp"],
)

# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Jan Samadhan AI backend is running"}


logger.info(f"CORS allowed origins: {allowed_origins}")
logger.info(f"Environment: {settings.ENVIRONMENT}")
logger.info("Jan Samadhan AI backend started [OK]")
