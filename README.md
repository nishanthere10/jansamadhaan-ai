<p align="center">
  <img src="frontend/public/logo2.jpg" alt="Jān Samādhan — जन शिकायत निवारण मंच" width="560"/>
</p>

<h1 align="center">Jān Samādhan · जन समाधान</h1>

<p align="center">
  <b>AI-powered civic issue redressal for Indian municipalities</b><br/>
  Snap a photo → AI triage → SLA-tracked resolution → public QR transparency.<br/>
  <sub><i>"जन शिकायत निवारण मंच" — the people's grievance redressal platform.</i></sub>
</p>

<div align="center">

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)
![Gemini 2.0 Flash](https://img.shields.io/badge/Gemini_2.0_Flash-8E75B2?logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_Inference-F55036)
![Twilio WhatsApp](https://img.shields.io/badge/Twilio_WhatsApp-F22F46?logo=twilio&logoColor=white)
![License](https://img.shields.io/badge/LICENSE-MIT-yellow.svg)
[![CI](https://github.com/nishanthere10/jansamadhaan-ai/actions/workflows/ci.yml/badge.svg)](https://github.com/nishanthere10/jansamadhaan-ai/actions/workflows/ci.yml)

</div>

<p align="center">
  <img src="https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&q=70" width="860" alt="Indian city street at dusk"/>
  <br/><sub>Photos: <a href="https://unsplash.com">Unsplash</a> · Logos: original project artwork</sub>
</p>

---

## 💡 The Problem

Every Indian municipality runs on paper grievances: complaints get phoned in, scribbled into registers, "lost" between departments, and citizens never learn the outcome. **Jān Samādhan** replaces that opacity with an accountable, measurable pipeline — every issue becomes a photo with GPS, a classified ticket with a **publicly visible SLA clock**, and a QR code anyone can scan to see exactly what happened.

| Without Jān Samādhan | With Jān Samādhan |
|---|---|
| Verbal complaints, no evidence | Geotagged photo + AI-verified description |
| Manual routing, days lost | Auto category + severity + department in seconds |
| No deadline, no accountability | Municipal SLA clock with public breach visibility |
| Citizen in the dark | Public QR tracker + WhatsApp confirmation |

## 🏗️ Architecture

```mermaid
flowchart TB
    subgraph CLIENTS["👥 Clients"]
        SPA["React 19 + Vite SPA<br/>Citizen · Worker · Authority dashboards"]
        WA["WhatsApp user<br/>(no app install needed)"]
    end

    subgraph EDGE["🛡️ Edge"]
        API["FastAPI REST API<br/>Supabase JWT-protected"]
        WH["Twilio WhatsApp Webhook<br/>whatsapp_ai module"]
    end

    subgraph AI["🧠 AI Pipeline"]
        LG["LangGraph Triage Graph"]
        GV["Gemini 2.0 Flash<br/>vision · photo analysis"]
        GT["Groq inference<br/>classification · translation"]
    end

    subgraph DATA["🗄️ Data"]
        SB["Supabase Postgres<br/>RLS policies + Storage"]
        AUTH["Supabase Auth<br/>JWT issuing"]
    end

    SPA -->|"REST + Bearer JWT"| API
    WA -->|"photo + text"| WH
    WH --> API
    API --> LG
    LG --> GV
    LG --> GT
    API --> SB
    API --> AUTH
    SB -.->|"public token projection"| API
```


## 🔄 The Life of a Complaint

```mermaid
sequenceDiagram
    autonumber
    actor C as Citizen
    participant FE as React SPA
    participant BE as FastAPI
    participant AI as LangGraph + Gemini + Groq
    participant DB as Supabase Postgres
    participant WA as WhatsApp (Twilio)

    C->>FE: Snap photo of issue + GPS
    FE->>BE: POST /api/incidents/upload
    BE->>AI: Vision analysis · classify · translate
    AI-->>BE: category · severity · dept · trust score
    BE->>DB: Store incident + SLA due date
    BE-->>WA: Confirmation message + tracking link
    C->>FE: /track/:id — live SLA status
    BE->>DB: Worker resolves → status + photo proof
    FE->>BE: GET /api/incidents/public/track/:token
    FE-->>C: "Resolved in 9h of 24h SLA ✅"
```

### ⏱️ Municipal SLA Engine

Real deadlines, not vibes. The SLA engine (`backend/app/services/sla_service.py`, mirrored in `frontend/lib/sla.ts`) assigns every category a target window, tightened by severity:

| Category | Standard | Critical |
|---|---|---|
| 🗑️ Garbage · Open manhole | 12 h | 6 h |
| 💧 Water leak · Drainage · Streetlight | 24 h | 12 h |
| 🕳️ Pothole · Road damage | 48 h | 24 h |
| 🌳 Encroachment · Horticulture | 72 h | 36 h |

States: `ON TRACK` → `EXPIRING SOON` (< 3 h left) → `BREACHED` · `MET` · `CLOSED` · `UNKNOWN` — computed **identically server- and client-side**, powering the public tracker, worker queues, and authority analytics.

### 📡 How the QR tracker works

```mermaid
flowchart LR
    QR["QR code on site<br/>encodes public token"] -->|"citizen scans"| WEB["/track/:id — no login"]
    WEB --> GET["GET /api/incidents/<br/>public/track/:token"]
    GET --> PROJ["Safe projection:<br/>status · SLA · timeline · photo proof"]
    PROJ --> CIT["Citizen sees the truth.<br/>No dashboard, no account, no excuses."]
```

## 🧭 Role Journeys

```mermaid
flowchart LR
    subgraph CIT["🧑 Citizen"]
        R1["Report with photo<br/>Track via QR<br/>Give feedback"]
    end
    subgraph WRK["🦺 Worker"]
        R2["See assigned queue<br/>Resolve with photo proof<br/>Build trust score"]
    end
    subgraph AUT["🏛️ Authority"]
        R3["Triage + assign<br/>Monitor SLA breaches<br/>QR projects + analytics"]
    end
    CIT -->|"issues flow in"| AUT -->|"work flows down"| WRK -->|"proof flows back"| AUT
    AUT -.->|"outcomes flow back"| CIT
```


## ✨ Feature Gallery

<table>
  <tr>
    <td width="33%" align="center">
      <img src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=70" alt="Report from phone" width="100%"/><br/>
      <b>📸 Snap &amp; Report</b><br/><sub>Photo + GPS in seconds — AI verifies the description against the image</sub>
    </td>
    <td width="33%" align="center">
      <img src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1200&q=70" alt="AI triage" width="100%"/><br/>
      <b>🤖 AI Triage</b><br/><sub>Gemini 2.0 Flash vision + Groq classification &amp; translation, orchestrated by LangGraph</sub>
    </td>
    <td width="33%" align="center">
      <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=70" alt="Analytics" width="100%"/><br/>
      <b>📊 Authority Analytics</b><br/><sub>SLA breach heat, duplicate clustering, department throughput</sub>
    </td>
  </tr>
  <tr>
    <td width="33%" align="center">
      <img src="https://images.unsplash.com/photo-1567721913486-6585f069b332?w=1200&q=70" alt="QR on site" width="100%"/><br/>
      <b>🏷️ QR Public Projects</b><br/><sub>Physical QR boards on assets — anyone scans, everyone sees the truth</sub>
    </td>
    <td width="33%" align="center">
      <img src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=1200&q=70" alt="WhatsApp" width="100%"/><br/>
      <b>💬 WhatsApp Intake</b><br/><sub>No app? No problem. Report and confirm entirely over WhatsApp</sub>
    </td>
    <td width="33%" align="center">
      <img src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=70" alt="Field workers" width="100%"/><br/>
      <b>🦺 Worker Trust Loop</b><br/><sub>Resolution with photo proof builds a worker credibility metric</sub>
    </td>
  </tr>
</table>

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · TypeScript · Vite · Tailwind CSS 4 · shadcn/ui · Zustand · React Router (code-split) |
| **Backend** | FastAPI · Pydantic v2 · Uvicorn |
| **AI** | LangGraph orchestration · Gemini 2.0 Flash (vision) · Groq (classification / translation) |
| **Data & Auth** | Supabase Postgres (RLS) · Supabase Auth (JWT) · Supabase Storage |
| **Messaging** | Twilio WhatsApp Business API (webhook intake + confirmation) |
| **Quality** | pytest · ruff · vulture · knip · tsc strict · GitHub Actions CI |

## 🚀 Quickstart

**Prerequisites:** Node 18+, Python 3.10+, Git — plus a [Supabase](https://supabase.com) project and a [Groq](https://console.groq.com) API key *(optional: Gemini & Twilio for vision + WhatsApp)*.

```bash
# 1 · Clone
git clone https://github.com/nishanthere10/jansamadhaan-ai.git
cd jansamadhaan-ai

# 2 · Backend
cd backend
python -m venv .venv
.\.venv\Scripts\activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env              # add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY…
uvicorn app.main:app --reload       # → http://localhost:8000/docs

# 3 · Frontend
cd ../frontend
npm install
npm run dev                         # → http://localhost:5173
```

### 🔑 Environment Variables (backend `.env`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` / `SUPABASE_JWT_SECRET` | Database, auth & storage |
| `GEMINI_API_KEY` / `GEMINI_MODEL` (`gemini-2.0-flash`) | Vision analysis |
| `GROQ_API_KEY` / `GROQ_MODEL` | Classification & translation |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | WhatsApp intake |
| `FRONTEND_URL` | Base URL used in QR codes & WhatsApp links |
| `ENVIRONMENT` | `production` (default) hardens auth & disables demo data; `DEV_AUTH_BYPASS` only works outside production |

## 🗺️ API Map

| Route | Endpoint | Auth |
|---|---|---|
| Auth | `POST /api/auth/signup · login · aadhar-login · logout` · `GET /me · /workers` | JWT |
| Incidents | `POST /upload` · `GET /{id}` · `PUT /{id}/status · /{id}/triage` · `GET /{id}/updates` · `POST /{id}/reprocess · /{id}/feedback` · `GET /reverse-geocode` | JWT |
| **Public** | `GET /api/incidents/public/track/{token}` — QR tracker, **no login** | 🌐 Public |
| AI | `POST /api/ai/translate · /classify · /vision/analyze` | JWT |
| QR Projects | `GET · PUT · DELETE /api/qr-projects/{id}` | Authority |
| Notifications | `PUT /api/notifications/{id}/read` | JWT |
| WhatsApp | Twilio webhook → media download → AI triage → incident creation | Signature |

## 🧪 Quality & CI

```bash
# Backend
cd backend && .\.venv\Scripts\activate
ruff check . && python -m pytest -q

# Frontend
cd frontend
npx tsc --noEmit && npm run build
```

GitHub Actions (`.github/workflows/ci.yml`) runs the gate on every push. Auth hardening, transactional resolution finalization, duplicate clustering, and the server-side SLA engine are covered by the phase audit in [`CURRENT_CODEBASE_REPORT.md`](CURRENT_CODEBASE_REPORT.md).

## 🗺️ Roadmap

- [x] LangGraph AI triage pipeline (vision + classify + translate)
- [x] Server-side SLA engine shared with the frontend
- [x] Public QR tracking with safe data projection
- [x] Transactional resolution finalization + audit trail
- [ ] Migration validation (006/007/008) — tracked in `remaining.md`
- [ ] Multi-language citizen UI beyond AI translation
- [ ] Municipal pilot with live SLA dashboards

## 🤝 Contributing

1. Fork → create a branch (`feature/my-feature`)
2. Run the quality gate locally (ruff · pytest · tsc · build)
3. Open a PR describing the *why*, not just the *what*

## 📄 License

MIT — see [`LICENSE`](LICENSE). Photos courtesy of [Unsplash](https://unsplash.com); project logos and product artwork are original assets of this repository.

---

<div align="center">
  <sub><b>जन समाधान</b> — because every citizen's complaint deserves a deadline. ⏱️🇮🇳</sub>
</div>


