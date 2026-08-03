# AI-Based Irrigation Management System for Predictive Water Scheduling and Crop Optimization

An advanced, production-ready system that leverages machine learning, weather forecasts, and soil moisture telemetry to deliver highly accurate irrigation recommendations. Featuring a modern Next.js PWA frontend with voice synthesis and recognition in regional languages powered by Sarvam AI, this application empowers farmers to optimize crop yields, reduce water consumption, and practice sustainable agriculture.

---

## 🏗️ Architecture & Project Directory Structure

This repository follows a scalable, decoupled architecture split into Frontend, Backend, Database migrations, and Machine Learning operations.

```text
project/
├── .github/                   # GitHub Actions workflows and pull request templates
├── database/                  # Database models, connections, and migrations
│   ├── alembic/               # Alembic database migrations directory
│   ├── database.py            # SQLAlchemy engine and session registry
│   ├── connection.py          # PostgreSQL connection pool health check utility
│   └── models.py              # Declarative database tables (SQLAlchemy models)
├── backend/                   # FastAPI application
│   ├── api/                   # API routers and endpoints
│   ├── auth/                  # JWT security and password hashing libraries
│   ├── middleware/            # Custom CORS, logging, and security middleware
│   ├── schemas/               # Pydantic models for validation and serialization
│   ├── services/              # Business logic (e.g. OpenWeather, Sarvam AI)
│   ├── utils/                 # Configuration and environment loaders
│   └── main.py                # FastAPI entrypoint
├── frontend/                  # Next.js web application
│   ├── app/                   # App Router pages and API routes
│   ├── components/            # Reusable UI components
│   ├── hooks/                 # Custom React hooks (e.g. useAuth, useSpeech)
│   ├── lib/                   # Integrations and utilities
│   ├── public/                # Static assets and PWA manifest config
│   ├── services/              # API Client callers (Axios/Fetch wrapper)
│   ├── store/                 # Global state management files (Zustand/Context)
│   ├── styles/                # CSS and styling files
│   └── types/                 # TypeScript interfaces and type files
├── ml/                        # Machine Learning pipelines and trained models
│   ├── preprocessing/         # Data cleaning, scaling, and processing pipelines
│   ├── feature_engineering/   # Moisture and meteorological lag feature generation
│   ├── training/              # Random Forest (crop optimization) & LSTM training scripts
│   ├── prediction/            # Inference execution pipelines
│   └── models/                # Serialized model binary weights (.pkl, .h5)
├── docs/                      # Project documentation and architectural design schemas
├── requirements.txt           # Unified Python dependency definitions
├── .env.example               # Example configurations template file
└── .gitignore                 # Exclusion configuration for version control
```

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS, PWA |
| **Backend** | FastAPI, Python 3.13 |
| **Database** | PostgreSQL, SQLAlchemy, Alembic Migrations |
| **Machine Learning** | TensorFlow (LSTM), Scikit-Learn (Random Forest), Pandas, NumPy |
| **External APIs** | OpenWeather API (Meteorological telemetry), Sarvam AI API (Voice integration) |
| **Deployment** | Vercel (Frontend) |

---

## 🚀 Setting Up the Development Environment

Follow these steps to establish a local collaborative environment.

### Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v20+ or v22+)
- [Python](https://www.python.org/) (v3.10 to v3.13)

---

### Step 1: Environment Configurations
1. Copy the example environment variables file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill in the required API keys (OpenWeather, Sarvam AI) and local configuration preferences.

---

### Step 2: Backend & ML Installation (Python)
1. Navigate to the root directory and create a virtual environment:
   ```bash
   python -m venv .venv
   ```
2. Activate the virtual environment:
   - **Windows (PowerShell):**
     ```powershell
     .venv\Scripts\Activate.ps1
     ```
   - **macOS / Linux:**
     ```bash
     source .venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run FastAPI development server:
   ```bash
   cd backend
   uvicorn backend.main:app --reload --port 8001
   ```

---

### Step 3: Frontend Installation (Next.js)
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

### Step 4: Database Migrations with Alembic
Ensure PostgreSQL is running locally and `DATABASE_URL` in `.env` points to your active database.
1. Generate a migration file:
   ```bash
   cd database
   alembic revision --autogenerate -m "Initial schema setup"
   ```
2. Apply migrations to the database:
   ```bash
   alembic upgrade head
   ```

---

## 🤝 Git & GitHub Collaboration Guidelines

We follow a structured branch-and-PR model to collaborate efficiently and prevent code regressions.

### Git Commands Workflow

1. **Initialize Git (if not already done):**
   ```bash
   git init
   ```
2. **Clone this repository (for team members):**
   ```bash
   git clone https://github.com/SUNKARAAJAY939/AI-Based-Irrigation-Management-System-for-Predictive-Water-Scheduling-and-Crop-Optimization.git
   ```
3. **Create a new Feature Branch:**
   Always create a descriptive branch before writing any code. Do not commit directly to `main`!
   ```bash
   # Schema: feature/feature-name or bugfix/bug-name
   git checkout -b feature/user-authentication
   ```
4. **Staging Changes:**
   ```bash
   git add .
   ```
5. **Commit with Meaningful Messages:**
   Follow conventional commit specifications (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`):
   ```bash
   git commit -m "feat: setup fastapi project structure and jwt schemas"
   ```
6. **Push to Remote Repository:**
   ```bash
   git push origin feature/user-authentication
   ```
7. **Open a Pull Request:**
   Go to the GitHub repository page, select your feature branch, click "New Pull Request", describe your changes, and assign reviewers.
