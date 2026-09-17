# Jan Samadhan - Codebase Analysis & Architecture Document

**Last Updated:** 2026-09-13  
**Project:** AI-Powered Public Grievance Platform  
**Status:** Active Development

---

## 🎯 Executive Summary

**Jan Samadhan** (meaning "Public Solution" in Hindi) is a civic incident management system that leverages AI, computer vision, and multi-language support to streamline public grievance reporting and resolution. The platform integrates WhatsApp as a primary citizen intake channel, features automatic incident classification, and provides role-based dashboards for authorities and field workers.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Key Features](#key-features)
5. [Database Schema](#database-schema)
6. [API Endpoints](#api-endpoints)
7. [Frontend Structure](#frontend-structure)
8. [AI Pipeline & Services](#ai-pipeline--services)
9. [Authentication & Security](#authentication--security)
10. [Development Setup](#development-setup)
11. [Project Structure](#project-structure)
12. [Deployment Architecture](#deployment-architecture)

---

## 🏢 Project Overview

### Purpose
Jan Samadhan is a **next-generation civic incident management system** designed to:
- Enable citizens to report public grievances via multiple channels (mobile app, WhatsApp)
- Automatically classify and route incidents to appropriate departments
- Provide real-time analytics and dashboards for authorities
- Dispatch workers efficiently with proof-of-resolution tracking
- Support multi-language incident reporting (Hindi, Tamil, Telugu, Marathi, English, Bengali)

### Target Users
- **Citizens**: Report incidents via app or WhatsApp
- **Authorities**: Manage incidents, view analytics, assign workers
- **Workers**: Receive assignments, update status, upload proof of resolution

### Design Standards
- Built following **UX4G** (User Experience for Government) design guidelines
- Accessibility-first approach for Indian governance systems
- Multi-language support with automatic translation

---

## 🛠️ Tech Stack

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | React | 18+ |
| **Language** | TypeScript | Latest |
| **Build Tool** | Vite | Latest |
| **Styling** | Tailwind CSS + UX4G Design System | - |
| **State Management** | Zustand | - |
| **Routing** | React Router | - |
| **Animations** | Framer Motion | - |
| **Charts/Analytics** | Recharts | - |
| **Database Client** | Supabase JS Client | - |
| **HTTP Client** | Fetch API | - |

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| **Framework** | FastAPI | Latest |
| **Language** | Python | 3.10+ |
| **Server** | Uvicorn | - |
| **Database** | PostgreSQL (via Supabase) | - |
| **Database ORM** | Supabase Python Client | - |
| **AI Orchestration** | LangGraph | - |
| **LLM Chain** | LangChain + LangChain-Groq | - |
| **LLM Provider** | Groq API | - |
| **Audio Transcription** | Groq Whisper | - |
| **Vision AI** | Groq Vision API | - |
| **WhatsApp Integration** | Twilio | - |
| **Authentication** | Supabase Auth (JWT) | - |
| **Validation** | Pydantic + Pydantic-Settings | - |
| **File Upload** | Multipart Form Data | - |

### Infrastructure
| Component | Technology |
|-----------|-----------|
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (RBAC) |
| **Frontend Deployment** | Vercel (recommended) |
| **Backend Deployment** | Railway / Render / Docker |
| **API Documentation** | OpenAPI/Swagger (FastAPI auto-generated) |

---

## 🏗️ Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React + Vite)              │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Citizen    │  │  Authority   │  │   Worker     │       │
│  │  Dashboard   │  │  Dashboard   │  │  Dashboard   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │               │
│         └─────────────────┼─────────────────┘               │
│                           │                                 │
│                    Zustand State Store                       │
│                           │                                 │
│                    Supabase JS Client                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
                HTTP REST API (JSON)
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                         Backend (FastAPI)                    │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Auth API    │  │ Incident API │  │ QR Projects  │       │
│  │  /auth       │  │  /incidents  │  │ /qr-projects │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   AI API     │  │Notifications │  │  WhatsApp    │       │
│  │  /ai         │  │ /notifications│  │ /webhooks    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌─────────────────── AI Pipeline (LangGraph) ──────────────┐
│  │                                                            │
│  │  Transcribe → Vision → Translate → Classify → Score      │
│  │                      ↓                                     │
│  │              Route Department → Store Metadata            │
│  │                                                            │
│  └────────────────────────────────────────────────────────┘
│                                                               │
│  ┌─────────────────── Services Layer ──────────────────────┐
│  │                                                            │
│  │  IncidentService    DuplicateDetection   TrustScoring    │
│  │  NotificationSvc    DeptRouting          ResolutionVerif  │
│  │                                                            │
│  └────────────────────────────────────────────────────────┘
│                                                               │
└───────────────────────┬──────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
    Supabase         Groq API       Twilio API
  (PostgreSQL)    (LLM + Vision)   (WhatsApp)
     Auth DB        Transcription     Messaging
```

### Data Flow - Incident Reporting

```
1. Citizen Reports via App/WhatsApp
   ↓
2. Incident Created (initial metadata)
   ↓
3. AI Pipeline Triggered (Background Task)
   ├─ Transcribe audio (if provided)
   ├─ Analyze images (vision)
   ├─ Translate to English (if needed)
   ├─ Classify category & severity
   ├─ Calculate trust score
   └─ Route to department
   ↓
4. Metadata Stored in DB
   ↓
5. Authority/Worker Notified
   ↓
6. Worker Assigned & Dispatched
   ↓
7. Resolution Submitted & Verified
```

---

## ✨ Key Features

### 1. **Multi-Channel Incident Intake**
- ✅ Web/Mobile app (React frontend)
- ✅ WhatsApp integration (Twilio-powered conversational intake)
- ✅ Support for text, photos, audio, and location data
- ✅ Automatic language detection and translation

### 2. **AI-Powered Classification**
- 🧠 **Incident Type Classification** - Auto-categorize (pothole, streetlight, water, etc.)
- 📊 **Severity Scoring** - Determine urgency (low, medium, high, critical)
- 🎯 **Department Routing** - Smart assignment to relevant departments
- 🔍 **Duplicate Detection** - Cluster similar reports to avoid redundancy
- ⭐ **Trust Scoring** - Calculate citizen credibility based on history

### 3. **Computer Vision**
- 📸 Analyze uploaded photos for damage assessment
- 🤖 Extract visual evidence from incident images
- 📍 Geo-tagging support for location-based incident tracking

### 4. **Multi-Language Support**
- 🌐 Support for: **English, Hindi, Tamil, Telugu, Marathi, Bengali**
- 🔄 Automatic translation via Groq LLM
- 💬 Preserve original text with translated metadata

### 5. **Real-Time Analytics Dashboard**
- 📈 Interactive charts (Recharts) with incident trends
- 🗺️ Heatmap visualization of incident hotspots
- 📊 Department-wise incident breakdown
- 📉 Severity and status distribution

### 6. **Role-Based Access Control (RBAC)**
- 👨‍💼 **Citizen**: Report incidents, track status, view own incidents
- 🏛️ **Authority**: Manage all incidents, view analytics, dispatch workers
- 👷 **Worker**: Receive assignments, update resolution status, upload proof

### 7. **WhatsApp Integration**
- 💬 Conversational incident intake via WhatsApp
- 📝 Step-by-step guided complaint flow
- 📸 Media upload via WhatsApp
- 🔗 Deep linking to web dashboard

### 8. **Worker Assignment & Tracking**
- 🚀 Smart worker dispatch based on location and skills
- ✅ Proof-of-resolution verification (photo + GPS)
- 📍 Real-time location tracking
- ⏱️ Resolution time metrics

### 9. **Notifications System**
- 🔔 In-app notifications for status updates
- 💬 WhatsApp status updates
- 📧 Email alerts (future phase)
- ⚡ Real-time event-driven notifications

### 10. **QR Code Projects**
- 📱 QR code-based incident tracking
- 🏗️ Project-specific incident reports
- 📊 Project-level analytics and dashboards

---

## 💾 Database Schema

### Core Tables

#### 1. **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  full_name VARCHAR,
  phone_number VARCHAR,
  role VARCHAR (citizen | authority | worker),
  trust_score INTEGER DEFAULT 100,
  is_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### 2. **incidents**
```sql
CREATE TABLE incidents (
  id UUID PRIMARY KEY,
  tracking_id VARCHAR UNIQUE,
  citizen_id UUID REFERENCES users(id),
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  severity VARCHAR (low | medium | high | critical),
  status VARCHAR (pending | assigned | in_progress | resolved | closed),
  location_lat FLOAT,
  location_lng FLOAT,
  address VARCHAR,
  image_url VARCHAR,
  assigned_to UUID REFERENCES users(id),
  ai_processing_status VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### 3. **incident_ai_metadata**
```sql
CREATE TABLE incident_ai_metadata (
  id UUID PRIMARY KEY,
  incident_id UUID REFERENCES incidents(id),
  transcribed_text TEXT,
  translated_text TEXT,
  original_language VARCHAR,
  classified_category VARCHAR,
  classified_severity VARCHAR,
  confidence_score FLOAT,
  keywords TEXT[], -- JSON array
  secondary_departments TEXT[], -- JSON array
  vision_analysis TEXT,
  trust_score INTEGER,
  created_at TIMESTAMP
);
```

#### 4. **notifications**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);
```

#### 5. **qr_projects** (QR Code Projects)
```sql
CREATE TABLE qr_projects (
  id UUID PRIMARY KEY,
  name VARCHAR,
  description TEXT,
  qr_code_url VARCHAR,
  location_lat FLOAT,
  location_lng FLOAT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP
);
```

#### 6. **qr_project_incidents**
```sql
CREATE TABLE qr_project_incidents (
  id UUID PRIMARY KEY,
  qr_project_id UUID REFERENCES qr_projects(id),
  incident_id UUID REFERENCES incidents(id)
);
```

---

## 🔌 API Endpoints

### Authentication Endpoints
```
POST /api/v1/auth/register       - Register new user
POST /api/v1/auth/login          - Login user
POST /api/v1/auth/logout         - Logout user
GET  /api/v1/auth/me             - Get current user profile
PUT  /api/v1/auth/profile        - Update user profile
```

### Incident Management
```
POST /api/v1/incidents           - Create new incident
GET  /api/v1/incidents           - List incidents (role-filtered)
GET  /api/v1/incidents/{id}      - Get incident details
PUT  /api/v1/incidents/{id}      - Update incident status
PUT  /api/v1/incidents/{id}/triage - Triage/assign incident
DELETE /api/v1/incidents/{id}    - Delete incident
```

### AI Operations
```
POST /api/v1/ai/translate        - Translate text (standalone)
POST /api/v1/ai/classify         - Classify incident (standalone)
```

### Notifications
```
GET  /api/v1/notifications       - List notifications
PUT  /api/v1/notifications/{id}/read - Mark as read
DELETE /api/v1/notifications/{id}   - Delete notification
```

### QR Projects
```
POST /api/v1/qr-projects         - Create QR project
GET  /api/v1/qr-projects         - List QR projects
GET  /api/v1/qr-projects/{id}    - Get project details
PUT  /api/v1/qr-projects/{id}    - Update project
DELETE /api/v1/qr-projects/{id}  - Delete project
GET  /api/v1/qr-projects/{id}/incidents - Get project incidents
```

### WhatsApp Webhooks
```
POST /api/webhooks/whatsapp      - Receive WhatsApp messages (Twilio)
```

### Health Check
```
GET /health                      - API health status
GET /api/docs                    - OpenAPI/Swagger documentation
```

---

## 🎨 Frontend Structure

### Page Hierarchy

```
Frontend/
├── pages/
│   ├── auth/
│   │   ├── Login.tsx              - User login
│   │   └── Signup.tsx             - User registration
│   ├── public/
│   │   ├── LandingPage.tsx        - Public landing page
│   │   └── QrTracker.tsx          - QR code incident tracker
│   ├── citizen/
│   │   ├── Dashboard.tsx          - Citizen dashboard (own incidents)
│   │   └── ReportIncident.tsx     - Incident reporting form
│   ├── authority/
│   │   ├── Dashboard.tsx          - Authority dashboard (all incidents)
│   │   ├── Analytics.tsx          - Analytics & reports
│   │   ├── QrProjects.tsx         - Manage QR projects
│   │   └── components/
│   ├── worker/
│   │   └── Dashboard.tsx          - Worker assignments & updates
│   └── shared/
│       ├── IncidentsList.tsx      - Reusable incidents list
│       └── Settings.tsx           - User settings & preferences
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.tsx     - Route protection HOC
│   ├── layout/
│   │   ├── Layout.tsx             - Main layout wrapper
│   │   ├── Navbar.tsx             - Navigation bar
│   │   ├── AuthNavbar.tsx         - Authenticated navbar
│   │   └── Sidebar.tsx            - Sidebar navigation
│   ├── shared/
│   │   ├── IncidentDetailModal.tsx - Incident detail viewer
│   │   ├── HeatmapLayer.tsx       - Map heatmap component
│   │   ├── SeverityBadge.tsx      - Severity indicator
│   │   ├── StatusBadge.tsx        - Status indicator
│   │   ├── LoadingSpinner.tsx     - Loading indicator
│   │   └── EmptyState.tsx         - Empty state UI
│   └── ui/
│       ├── button.tsx             - Button component
│       ├── card.tsx               - Card component
│       ├── input.tsx              - Input component
│       ├── dialog.tsx             - Dialog/modal component
│       ├── badge.tsx              - Badge component
│       ├── label.tsx              - Label component
│       ├── textarea.tsx           - Textarea component
│       └── sonner.tsx             - Toast notifications
├── lib/
│   ├── api.ts                     - API client & helpers
│   ├── client.ts                  - Supabase client setup
│   ├── server.ts                  - Server utilities
│   ├── utils.ts                   - Utility functions
│   ├── useTranslation.ts          - i18n hook
│   ├── languages.ts               - Language definitions
│   └── supabase/
│       └── client.ts              - Supabase initialization
├── store/
│   ├── useAuthStore.ts            - Auth state (Zustand)
│   ├── useLanguageStore.ts        - Language preference
│   ├── useSidebarStore.ts         - Sidebar state
│   └── useThemeStore.ts           - Theme state
├── types/
│   └── index.ts                   - TypeScript type definitions
├── translations/
│   ├── en.ts                      - English translations
│   ├── hi.ts                      - Hindi translations
│   ├── ta.ts                      - Tamil translations
│   ├── te.ts                      - Telugu translations
│   ├── mr.ts                      - Marathi translations
│   └── bn.ts                      - Bengali translations
└── App.tsx                        - Root component
```

### Key State Management (Zustand Stores)

#### 1. **useAuthStore**
```typescript
{
  user: { id, email, role, full_name },
  token: string,
  isLoading: boolean,
  login: (email, password) => void,
  logout: () => void,
  updateProfile: (data) => void
}
```

#### 2. **useLanguageStore**
```typescript
{
  currentLanguage: 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn',
  setLanguage: (lang) => void,
  t: (key) => string  // Translation function
}
```

#### 3. **useSidebarStore**
```typescript
{
  isOpen: boolean,
  toggleSidebar: () => void
}
```

### Component Architecture

- **Smart Components** (pages/): Handle routing, data fetching, business logic
- **Presentational Components** (components/): Reusable UI with props-based logic
- **UI Library** (components/ui/): Base components (button, input, etc.)
- **Custom Hooks**: useTranslation, useAuth, useLanguage

---

## 🤖 AI Pipeline & Services

### LangGraph Pipeline Architecture

The AI pipeline is built with **LangGraph** and executes asynchronously as a directed graph:

```
START
  ↓
[1] Transcribe Node
  ├─ Input: audio_path (optional)
  ├─ Service: TranscriptionService
  ├─ Output: transcribed_text
  ↓
[2] Vision Analysis Node
  ├─ Input: image_url (optional)
  ├─ Service: VisionAnalysisService
  ├─ Output: vision_description, damage_severity
  ↓
[3] Translate Node
  ├─ Input: original_text (+ transcribed_text)
  ├─ Service: TranslationService
  ├─ Output: translated_text, detected_language
  ↓
[4] Classify Node
  ├─ Input: translated_text
  ├─ Service: ClassificationService
  ├─ Output: category, sub_category, keywords
  ↓
[5] Score Severity Node
  ├─ Input: translated_text, vision_data
  ├─ Service: SeverityScoringService
  ├─ Output: severity_score (0-100), severity_level
  ↓
[6] Route Department Node
  ├─ Input: category, severity_score
  ├─ Service: DepartmentRoutingService
  ├─ Output: primary_dept, secondary_depts, routing_confidence
  ↓
END
  ↓
Store Metadata in incident_ai_metadata table
```

### AI Services

#### 1. **TranscriptionService**
- **Purpose**: Convert audio to text
- **Provider**: Groq Whisper API
- **Input**: audio_path (Supabase Storage URL)
- **Output**: transcribed_text, confidence
- **Fallback**: Returns empty text if no audio provided

#### 2. **VisionAnalysisService**
- **Purpose**: Analyze images for incident evidence
- **Provider**: Groq Vision API (LLaVA-NeXT)
- **Input**: image_url (Supabase Storage URL)
- **Output**: visual_description, damage_assessment, identified_objects
- **Features**:
  - Damage severity from images
  - Object detection (pothole, streetlight, etc.)
  - Geo-spatial analysis hints

#### 3. **TranslationService**
- **Purpose**: Translate incident text to English
- **Provider**: Groq LLM (Mixtral/LLaMA2)
- **Input**: original_text, detected_language
- **Output**: translated_text, detected_language
- **Supported Languages**: 6 languages + detection
- **Fallback**: Returns original text if already in English

#### 4. **ClassificationService**
- **Purpose**: Categorize incident type and extract keywords
- **Provider**: Groq LLM
- **Input**: translated_text
- **Output**: category, sub_category, keywords, classification_confidence
- **Categories**:
  - Pothole/Road Damage
  - Streetlight
  - Water Supply
  - Sanitation
  - Public Safety
  - Other

#### 5. **SeverityScoringService**
- **Purpose**: Calculate incident severity level
- **Provider**: Groq LLM + Vision analysis
- **Input**: translated_text, vision_data, location_data
- **Output**: severity_score (1-100), severity_level (low/medium/high/critical)
- **Scoring Factors**:
  - Impact on public safety
  - Number of affected people
  - Infrastructure damage
  - Urgency of resolution

#### 6. **DepartmentRoutingService**
- **Purpose**: Determine which department should handle the incident
- **Provider**: Groq LLM + routing rules
- **Input**: category, severity_score, location_data
- **Output**: primary_department, secondary_departments, routing_confidence
- **Departments**:
  - Roads & Infrastructure
  - Utilities
  - Sanitation
  - Public Safety
  - Parks & Recreation

#### 7. **DuplicateDetectionService** (Future)
- **Purpose**: Cluster similar incidents to avoid duplication
- **Implementation**: Vector similarity search or fuzzy matching
- **Use Case**: Identify duplicate reports from multiple citizens

#### 8. **ResolutionVerificationService**
- **Purpose**: Verify worker's resolution submission
- **Input**: photo, location, worker_id, incident_id
- **Output**: verification_status, trust_score_adjustment
- **Features**:
  - GPS location verification
  - Photo timestamp validation
  - Similarity check to incident photo

#### 9. **TrustScoringService**
- **Purpose**: Calculate citizen credibility score
- **Input**: citizen_id, incident_history, resolution_accuracy
- **Output**: trust_score (0-100), trust_level
- **Factors**:
  - Incident resolution accuracy
  - Report spam history
  - Photo/evidence quality
  - Follow-up engagement

### State Model (ComplaintGraphState)

```python
class ComplaintGraphState:
    incident_id: str
    original_text: str
    audio_path: Optional[str]
    image_url: Optional[str]
    location_lat: Optional[float]
    location_lng: Optional[float]
    address: Optional[str]
    
    # Transcription
    transcribed_text: Optional[str]
    transcription_confidence: float = 0.0
    
    # Vision Analysis
    vision_description: Optional[str]
    damage_severity: Optional[str]
    
    # Translation
    translated_text: str
    detected_language: str = "en"
    
    # Classification
    category: str
    sub_category: Optional[str]
    keywords: List[str]
    classification_confidence: float = 0.0
    
    # Severity Scoring
    severity_score: int  # 1-100
    severity_level: str  # low, medium, high, critical
    
    # Department Routing
    primary_department: str
    secondary_departments: List[str]
    routing_confidence: float = 0.0
    
    # Metadata
    processing_timestamp: str
    pipeline_errors: List[str] = []
```

---

## 🔐 Authentication & Security

### Authentication Flow

```
1. User Registration (Supabase Auth)
   ├─ Email verification
   ├─ User role assignment (citizen/authority/worker)
   └─ Profile creation in users table

2. User Login
   ├─ Credentials verified by Supabase
   ├─ JWT token issued
   └─ Token stored in frontend localStorage

3. API Requests
   ├─ Frontend includes Bearer token in Authorization header
   ├─ Backend validates JWT signature
   ├─ Backend checks user role & permissions
   └─ Request processed with user context

4. Logout
   ├─ Token removed from frontend storage
   └─ Session cleared
```

### Role-Based Access Control (RBAC)

| Feature | Citizen | Authority | Worker |
|---------|---------|-----------|--------|
| Report Incident | ✅ | ❌ | ❌ |
| View Own Incidents | ✅ | ❌ | ❌ |
| View All Incidents | ❌ | ✅ | ❌ |
| Assign Worker | ❌ | ✅ | ❌ |
| View Analytics | ❌ | ✅ | ❌ |
| Manage QR Projects | ❌ | ✅ | ❌ |
| Receive Assignments | ❌ | ❌ | ✅ |
| Update Resolution | ❌ | ❌ | ✅ |
| Upload Proof | ❌ | ❌ | ✅ |

### Security Features

1. **JWT Authentication**: Token-based stateless auth
2. **CORS Protection**: Configurable allowed origins
3. **RBAC Enforcement**: Role checks on all protected endpoints
4. **Environment Variables**: Sensitive keys in .env files
5. **Supabase RLS** (Row-Level Security): Optional database-level access control
6. **Service Role Key**: Backend uses elevated permissions for admin tasks
7. **HTTPS Recommended**: For production deployment

### Protected Routes

Frontend uses `ProtectedRoute` component to enforce authentication and authorization:

```typescript
<ProtectedRoute requiredRole="citizen">
  <CitizenDashboard />
</ProtectedRoute>
```

---

## 🚀 Development Setup

### Prerequisites

```bash
Node.js ≥ 18
Python ≥ 3.10
Git
Supabase account
Groq API key
Twilio account (optional, for WhatsApp)
```

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env with:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY (not anon key!)
# - SUPABASE_JWT_SECRET
# - GROQ_API_KEY
# - TWILIO_* (optional)

# 5. Run the server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Backend runs on:** `http://localhost:8001`  
**API Docs:** `http://localhost:8001/docs`

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local with:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_API_URL=http://localhost:8001

# 4. Run dev server
npm run dev
```

**Frontend runs on:** `http://localhost:5173`

---

## 📁 Project Structure

### Backend Directory Tree

```
backend/
├── app/
│   ├── main.py                    # FastAPI app & router setup
│   ├── ai/
│   │   ├── tasks.py              # Background AI processing tasks
│   │   ├── models/
│   │   │   └── graph_state.py    # LangGraph state schema
│   │   └── services/
│   │       ├── langgraph_pipeline.py      # LangGraph orchestrator
│   │       ├── transcription_service.py   # Groq Whisper
│   │       ├── vision_service.py          # Groq Vision
│   │       ├── translation_service.py     # Language translation
│   │       ├── classification_service.py  # Category classification
│   │       ├── severity_scoring_service.py # Severity scoring
│   │       ├── department_routing_service.py # Dept routing
│   │       ├── duplicate_detection_service.py # Duplicate detection
│   │       ├── resolution_verification_service.py
│   │       └── trust_scoring_service.py   # Trust score calculation
│   ├── api/
│   │   ├── auth.py               # Authentication endpoints
│   │   ├── incident.py           # Incident CRUD endpoints
│   │   ├── ai.py                 # AI testing endpoints
│   │   ├── notifications.py      # Notification endpoints
│   │   └── qr_projects.py        # QR project endpoints
│   ├── core/
│   │   ├── config.py             # Settings & configuration
│   │   ├── database.py           # Supabase client initialization
│   │   └── security.py           # JWT & permission checks
│   ├── schemas/
│   │   ├── auth.py               # Auth request/response schemas
│   │   └── incident.py           # Incident schemas
│   ├── services/
│   │   ├── incident_service.py   # Incident business logic
│   │   ├── notification_service.py # Notification logic
│   │   └── ai/ (AI services here)
│   └── whatsapp_ai/
│       ├── controllers/
│       │   └── whatsapp_webhook_controller.py # Twilio webhook
│       ├── services/
│       │   └── twilio_webhook_service.py # WhatsApp processing
│       ├── schemas/
│       └── utils/
├── migrations/
│   ├── 003_add_clustering_columns.sql
│   └── 004_phase4.sql           # Notifications & trust scoring
├── tests/
│   ├── test_ai.py
│   ├── test_api.py
│   ├── test_db.py
│   ├── test_pipeline.py
│   └── test_trace.py
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment template
├── Dockerfile                    # Docker containerization
└── seed_workers.py              # Database seeding script
```

### Frontend Directory Tree

```
frontend/
├── pages/
│   ├── auth/ (Login, Signup)
│   ├── public/ (LandingPage, QrTracker)
│   ├── citizen/ (Dashboard, ReportIncident)
│   ├── authority/ (Dashboard, Analytics, QrProjects)
│   ├── worker/ (Dashboard)
│   └── shared/ (IncidentsList, Settings)
├── components/
│   ├── auth/ (ProtectedRoute)
│   ├── layout/ (Layout, Navbar, Sidebar)
│   ├── shared/ (UI components)
│   └── ui/ (Base components)
├── lib/
│   ├── api.ts               # API client
│   ├── client.ts            # Supabase client
│   ├── translations/        # i18n files
│   └── utils.ts
├── store/ (Zustand stores)
├── types/
├── public/
│   ├── css/ (UX4G design system styles)
│   └── favicon.svg
├── App.tsx
├── main.tsx
├── routes.tsx
├── index.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🌐 Deployment Architecture

### Frontend Deployment (Vercel Recommended)

```
GitHub Repo → Vercel
           ↓
        Build (npm build)
           ↓
        Optimize & Deploy
           ↓
    CDN + Edge Caching
           ↓
    HTTPS URL (e.g., app.jansamadhan.gov)
```

**Environment Variables (Vercel):**
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=https://api.jansamadhan.gov
```

### Backend Deployment (Railway/Render)

```
GitHub Repo → Railway/Render
            ↓
        pip install -r requirements.txt
            ↓
        uvicorn app.main:app --host 0.0.0.0 --port $PORT
            ↓
        HTTPS URL (e.g., api.jansamadhan.gov)
```

**Environment Variables (Backend):**
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=xxx
GROQ_API_KEY=gsk_...
TWILIO_ACCOUNT_SID=xxx
TWILIO_AUTH_TOKEN=xxx
ENVIRONMENT=production
```

### Database (Supabase)

- **Hosting**: Supabase Cloud (PostgreSQL)
- **Access**: Backend via Service Role Key
- **Frontend**: Via Supabase JS Client (Anon Key)
- **Security**: Row-Level Security (RLS) policies (optional)

### API Integration Flow

```
Frontend (Vercel)
   ↓ (HTTP REST)
Backend API (Railway)
   ├─ Incident/Auth/Notification endpoints
   ├─ WhatsApp webhook handler
   └─ AI Pipeline trigger
   ↓
Supabase PostgreSQL
   ├─ User data
   ├─ Incident records
   └─ AI metadata storage
   ↓
External Services
   ├─ Groq API (LLM + Vision)
   ├─ Twilio (WhatsApp)
   └─ Supabase Storage (Media files)
```

---

## 📦 Dependencies Summary

### Backend Python Packages

```
fastapi              - Web framework
uvicorn              - ASGI server
pydantic             - Data validation
pydantic-settings    - Config management
python-multipart     - File uploads
supabase             - Database client
langgraph            - Graph orchestration
langchain            - LLM chains
langchain-groq       - Groq integration
langchain-core       - Core LLM abstractions
groq                 - Groq API client
```

### Frontend Node Packages (inferred)

```
react                - UI framework
typescript           - Type safety
react-router-dom     - Routing
zustand              - State management
tailwindcss          - Styling
framer-motion        - Animations
recharts             - Charts
@supabase/supabase-js - Database client
vite                 - Build tool
```

---

## 🔄 Key Workflows

### Workflow 1: Citizen Reports Incident

```
1. Citizen fills incident form (app)
   ├─ Title, Description, Category
   ├─ Location (GPS)
   ├─ Photo/Video (optional)
   └─ Audio note (optional)

2. POST /api/v1/incidents
   └─ IncidentService.create_incident()
      ├─ Generate tracking ID
      ├─ Insert into incidents table
      ├─ Queue background task
      └─ Return incident ID

3. Background Task: process_incident_ai_background()
   └─ LangGraph Pipeline executes:
      ├─ Transcribe audio (if present)
      ├─ Analyze image (if present)
      ├─ Translate to English
      ├─ Classify category
      ├─ Score severity
      ├─ Route to department
      └─ Save metadata

4. Authority receives notification
   ├─ Alert on dashboard
   └─ Can view and assign worker

5. Worker receives assignment
   ├─ WhatsApp notification
   ├─ Navigates to incident
   └─ Updates status to "in_progress"

6. Worker submits resolution
   ├─ Takes photo of resolution
   ├─ Uploads proof
   └─ Marks incident "resolved"

7. Resolution verification
   ├─ Location check (GPS)
   ├─ Photo analysis
   └─ Trust score update

8. Incident closed
   ├─ Notification sent to citizen
   ├─ Feedback requested
   └─ Archived
```

### Workflow 2: WhatsApp Incident Report

```
1. Citizen sends message to WhatsApp bot
   └─ "I want to report a pothole"

2. POST /api/webhooks/whatsapp (Twilio webhook)
   └─ TwilioWebhookService.process_webhook()

3. Conversational flow:
   ├─ Bot: "Describe the issue"
   ├─ Citizen: "Large pothole on Main St"
   ├─ Bot: "Send a photo"
   ├─ Citizen: [photo]
   ├─ Bot: "Thanks! Processing your report"
   └─ Citizen: [confirmation]

4. Incident created programmatically
   ├─ From WhatsApp data
   ├─ AI Pipeline triggered
   └─ Tracking ID sent back

5. Citizen can track via QR code
   ├─ QR links to web tracker
   └─ Real-time status updates
```

### Workflow 3: Authority Analytics

```
1. Authority opens Dashboard
   ├─ GET /api/v1/incidents
   └─ List all incidents (role-filtered)

2. Real-time metrics displayed:
   ├─ Total incidents
   ├─ By category (pie chart)
   ├─ By severity (bar chart)
   ├─ By status (funnel)
   └─ Geographic heatmap

3. Analytics view
   ├─ Time-series trends
   ├─ Department performance
   ├─ Resolution time metrics
   └─ Citizen trust scores

4. Export reports
   └─ CSV/PDF export (future phase)
```

---

## 🧪 Testing

### Test Files

```
backend/tests/
├── test_ai.py          # AI pipeline tests
├── test_api.py         # API endpoint tests
├── test_db.py          # Database operation tests
├── test_pipeline.py    # LangGraph pipeline tests
└── test_trace.py       # Tracing/debugging tests
```

### Running Tests

```bash
cd backend
pytest tests/ -v
pytest tests/test_ai.py -v  # Specific test file
```

---

## 📊 Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **FastAPI** | Type-safe, async-ready, auto-documentation (Swagger) |
| **LangGraph** | Complex multi-step AI orchestration with state management |
| **Groq API** | Fast LLM inference, multi-modal support, cost-effective |
| **Supabase** | Postgres + Auth + Storage in one platform, RLS support |
| **Zustand** | Lightweight state management, minimal boilerplate |
| **React Router** | Standard routing for role-based UI |
| **Tailwind CSS** | Utility-first styling, UX4G integration |
| **Vite** | Fast dev build, modern ES modules |
| **Twilio** | WhatsApp integration, webhook support |

---

## 🚧 Future Enhancements

- [ ] SMS intake (not just WhatsApp)
- [ ] Mobile app (React Native)
- [ ] Advanced duplicate detection (vector embeddings)
- [ ] Video incident reports
- [ ] Blockchain-based resolution verification
- [ ] Predictive incident forecasting
- [ ] Worker offline mode
- [ ] Advanced audit logging
- [ ] Multi-language voice support
- [ ] Email notifications
- [ ] Third-party integrations (Slack, Teams)

---

## 📞 Support & Documentation

- **API Docs**: http://localhost:8001/docs (Swagger)
- **GitHub**: [Project Repository]
- **Supabase Docs**: https://supabase.com/docs
- **Groq API Docs**: https://console.groq.com/docs
- **Twilio Docs**: https://www.twilio.com/docs

---

## 📝 License & Credits

- **Project**: Jan Samadhan (CivicResponse AI)
- **Built For**: Indian Governance (UX4G Standards)
- **Status**: Active Development
- **Last Updated**: 2026-09-13

---

**Document Version**: 1.0.0  
**Last Modified**: 2026-09-13  
**Author**: AI Codebase Analysis
