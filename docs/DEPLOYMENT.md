# Production Deployment & Hosting Guide — SehatSetu

> **Document Version:** 1.0.0  
> **Deployment Architecture:** Vercel (Frontend SPA) + Render (FastAPI Backend) + Supabase (PostgreSQL / Auth / Realtime)

---

## 1. Cloud Infrastructure Architecture

```mermaid
graph LR
    User[Web Browser / Tablet] -->|HTTPS| Vercel[Vercel CDN / Edge]
    Vercel -->|SPA Bundle| User
    User -->|REST / HTTPS| Render[Render Web Service (FastAPI)]
    User -->|WSS Realtime| SupabaseRT[Supabase Realtime Cluster]
    Render -->|PostgreSQL 5432| SupabaseDB[(Supabase Managed DB)]
```

---

## 2. Step-by-Step Deployment Instructions

### 2.1 Step 1: Supabase Infrastructure Setup
1. Log in to [Supabase Dashboard](https://app.supabase.com) and create a new project: `sehatsetu-prod`.
2. Open **SQL Editor** and run the initial schema migration script:
   - Execute `supabase/migrations/001_initial_schema.sql` (Creates tables, enums, indexes, and RLS policies).
3. Enable Realtime on the `visits` table:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE visits;
   ```
4. Optionally run `supabase/seed.sql` to populate default departments and synthetic test patients.
5. In **Project Settings -> API**, copy:
   - `Project URL`
   - `anon public key`
   - `service_role secret key`
   - `Database connection string (URI)`

---

### 2.2 Step 2: Backend Deployment on Render
1. Log in to [Render Dashboard](https://dashboard.render.com) and click **New + -> Web Service**.
2. Connect the GitHub repository `https://github.com/Syed-Sameer13/SehatSetu.git`.
3. Configure the build parameters:
   - **Name:** `sehatsetu-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
4. Add Environment Variables (Refer to `docs/ENVIRONMENT.md`):
   - `ENVIRONMENT` = `production`
   - `SUPABASE_URL` = `https://your-project.supabase.co`
   - `SUPABASE_ANON_KEY` = `your-anon-key`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your-service-key`
   - `DATABASE_URL` = `postgresql://postgres:password@db.your-project.supabase.co:5432/postgres`
   - `SUPABASE_JWT_SECRET` = `your-jwt-secret`
   - `CORS_ORIGINS` = `https://sehatsetu.vercel.app`
5. Click **Deploy Web Service**. Once deployed, copy your Render URL (e.g. `https://sehatsetu-api.onrender.com`).

---

### 2.3 Step 3: Frontend Deployment on Vercel
1. Log in to [Vercel Dashboard](https://vercel.com) and click **Add New... -> Project**.
2. Import the `SehatSetu` repository.
3. Configure project settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Add Environment Variables:
   - `VITE_API_BASE_URL` = `https://sehatsetu-api.onrender.com/api/v1`
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
   - `VITE_ENABLE_REALTIME` = `true`
   - `VITE_APP_ENV` = `production`
5. Click **Deploy**.

---

## 3. Post-Deployment Smoke Tests & Verification

After deployment, perform these verification checks:

1. **Backend Health Check:**
   ```bash
   curl -i https://sehatsetu-api.onrender.com/health
   # Expected: HTTP 200 OK {"status": "ok", "environment": "production"}
   ```
2. **CORS Verification:**
   ```bash
   curl -H "Origin: https://sehatsetu.vercel.app" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS -i https://sehatsetu-api.onrender.com/api/v1/departments
   # Verify Access-Control-Allow-Origin header is present
   ```
3. **End-to-End Registration Flow:**
   - Open `https://sehatsetu.vercel.app` in two separate browser windows.
   - Register a synthetic patient in Window A.
   - Verify that the patient appears in the dynamic queue in Window B without requiring a page reload.
