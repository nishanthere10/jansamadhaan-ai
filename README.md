# Jan Samadhan — AI-Powered Public Grievance Platform 🇮🇳

A next-generation civic incident management system powered by **AI classification, computer vision, and multi-language support** — built for Indian governance under UX4G design standards.

## Architecture

```
public-grievance/
├── frontend/       React + Vite + TypeScript (User Interface)
├── backend/        FastAPI + Python (API + AI Pipeline)
└── docs/           Project documentation & audit reports
```

## Quick Start

### Prerequisites
- **Node.js** ≥ 18 and **npm** ≥ 9
- **Python** ≥ 3.10 and **pip**
- **Supabase** project (Postgres database + Auth)
- **Groq API Key** for AI inference

### 1. Clone
```bash
git clone https://github.com/<your-username>/public-grievance.git
cd public-grievance
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase URL, keys, Groq API key

# Start the API server
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start the dev server
npm run dev
```

### 4. Access
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8001
- **API Docs:** http://localhost:8001/docs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Zustand, Framer Motion, Recharts |
| **Styling** | Tailwind CSS + UX4G Design System |
| **Backend** | FastAPI, Python 3.10+ |
| **AI Pipeline** | Groq (LLM + Vision), LangGraph orchestration |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (RBAC: Citizen, Authority, Worker) |
| **Deployment** | Vercel (frontend) + Railway/Render (backend) |

## Key Features

- 🧠 **AI Classification** — Auto-categorize incidents by type, severity, department
- 📷 **Computer Vision** — Analyze uploaded photos for damage assessment
- 🌐 **Multi-Language** — Hindi, Tamil, Telugu, Marathi → auto-translated
- 📱 **WhatsApp Intake** — Citizens can report via WhatsApp
- 🔍 **Duplicate Detection** — Cluster similar reports automatically
- 📊 **Live Analytics** — Real-time dashboards with Recharts
- 🛡️ **Spam Detection** — AI-powered integrity gatekeeper
- 👷 **Worker Dispatch** — Smart assignment with proof-of-resolution

## Environment Variables

### Backend (`backend/.env`)
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
GROQ_API_KEY=gsk_...
```

### Frontend (`frontend/.env.local`)
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8001
```

## Deploy

### Frontend → Vercel
1. Connect repo, set root directory to `frontend/`
2. Framework preset: **Vite**
3. Add env vars from `.env.local`

### Backend → Railway / Render
1. Connect repo, set root directory to `backend/`
2. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Add env vars from `.env`

## License

MIT © Jan Samadhan Team
