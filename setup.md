# Jan Samadhan Developer Setup Guide

Welcome to the **Jan Samadhan** team! This guide will help you get your local environment running smoothly so you can start contributing to the AI-Powered Public Grievance Platform.

We've recently modernized and split the monorepo into clean `frontend` and `backend` directories. This document covers setting up both.

---

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed on your machine:

1. **[Node.js](https://nodejs.org/)** (v18 or higher) & **npm**
2. **[Python](https://www.python.org/downloads/)** (v3.10 or higher)
3. **[Git](https://git-scm.com/)**
4. **[Supabase Account](https://supabase.com/)** (You'll either need access to the team's shared Supabase project or spin up your own for local testing)
5. **[Groq Account](https://console.groq.com/)** (For AI inference)
6. *(Optional)* **[Twilio Account](https://www.twilio.com/)** (If you are testing WhatsApp intake features)

---

## 🏗️ 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/public-grievance.git
cd public-grievance
```

You should see two main folders: `frontend` and `backend`.

---

## 💻 2. Frontend Setup (React/Vite)

Our frontend is built with React 18, Vite, TypeScript, Tailwind CSS, and Zustand for state management.

### Install Dependencies
```bash
cd frontend
npm install
```

### Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` in your editor and fill in your Supabase details (get these from your Supabase Project Settings -> API):
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJh...
   VITE_API_URL=http://localhost:8001
   ```

### Run the Dev Server
```bash
npm run dev
```
The frontend should now be running at [http://localhost:5173](http://localhost:5173).

---

## ⚙️ 3. Backend Setup (FastAPI)

The backend handles AI processing, notifications, and WhatsApp integration, and serves as our middle-layer to Supabase in complex workflows.

### Create a Virtual Environment & Install Dependencies
Open a *new* terminal window.

```bash
cd backend
python -m venv venv

# Activate the virtual environment:
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### Environment Variables
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the required keys. 
   *Note: The backend requires the **Service Role Key** for Supabase (which bypasses RLS policies) to handle admin tasks.*

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJh...  # VERY IMPORTANT: Use the Service Role Key, NOT the Anon Key!
   SUPABASE_JWT_SECRET=your-jwt-secret # Found in Supabase API settings
   
   GROQ_API_KEY=gsk_... # Get this from Groq Console
   
   # Optional: For WhatsApp features
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_PHONE_NUMBER=your-twilio-number
   ```

### Database Setup
The backend contains SQL migrations and seed scripts. If you are pointing to a fresh Supabase instance, you need to apply the schemas.
1. Run the `.sql` scripts located in `backend/migrations/` in your Supabase SQL Editor.
2. Initialize dummy workers running the seed script:
   ```bash
   python seed_workers.py
   ```

### Run the FastAPI Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
The backend API should now be running. You can view the automatic Swagger documentation at [http://localhost:8001/api/docs](http://localhost:8001/api/docs).

---

## 🧪 4. Testing Your Setup

To verify everything is wired up correctly:

1. Create an account via the frontend signup page (`http://localhost:5173/signup`). By default, you will be a `citizen`.
2. To test `authority` or `worker` views, manually change your role in the Supabase `users` table, then log out and log back in.
3. Submit a test grievance on the citizen dashboard.
4. Check your terminal running FastAPI: you should see logs showing the AI pipeline classifying your grievance.
5. Log in as an authority; the incident should appear on the dashboard with AI confidence scores and category tags.

---

## 🧠 Developer Workflows

* **Adding new React UI Components**: We use Shadcn UI and UX4G design principles. Add components to `frontend/src/components/ui/`.
* **Adding new API Routes**: Add files to `backend/app/api/` and remember to include the router in `backend/app/main.py`.
* **Running Tests**: We use `pytest` for the backend. From the `backend` folder, run `pytest tests/`.

If you run into any issues, check the `docs/` folder or reach out to the team!
