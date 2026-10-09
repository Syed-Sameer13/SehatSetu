# Environment Variables & Configuration Guide — SehatSetu

> **Document Version:** 1.0.0  
> **Target Environments:** Local Development, Staging, Production (Vercel / Render / Supabase)

---

## 1. Environment Variable Reference Matrix

### 1.1 Backend Environment Variables (`backend/.env`)

| Variable Name | Scope / Tier | Required? | Default / Example | Purpose & Source |
| :--- | :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | Backend | Yes | `development` | Environment mode (`development`, `staging`, `production`). |
| `PORT` | Backend | Yes | `8000` | Port for the FastAPI server to listen on. |
| `HOST` | Backend | Yes | `0.0.0.0` | Binding host address. |
| `CORS_ORIGINS` | Backend | Yes | `http://localhost:5173,http://localhost:3000` | Comma-separated list of allowed frontend origin URLs. |
| `SUPABASE_URL` | Backend / DB | Yes | `https://xyzproject.supabase.co` | Project URL from Supabase Project Settings -> API. |
| `SUPABASE_ANON_KEY` | Backend | Yes | `eyJhbGciOi...` | Public Anonymous API Key from Supabase Dashboard. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend Only | Yes | `eyJhbGciOi...` | High-privilege key from Supabase Dashboard. **Never expose to frontend!** |
| `DATABASE_URL` | Backend / DB | Yes | `postgresql://postgres:pwd@db.xyz.supabase.co:5432/postgres` | Direct or pooled PostgreSQL connection URI from Supabase Settings -> Database. |
| `SUPABASE_JWT_SECRET` | Backend / Auth | Yes | `your-supabase-jwt-secret` | Secret used to verify Supabase JWT tokens in FastAPI middleware. |
| `GEMINI_API_KEY` | Backend / AI | No | `AIzaSy...` | Google AI Studio API key for optional symptom summarization. |
| `AI_MODEL_NAME` | Backend / AI | No | `gemini-1.5-flash` | LLM model identifier. |
| `ENABLE_AI_SUMMARIZATION` | Backend / Feature | No | `false` | Feature flag to enable/disable optional LLM summarization. |

---

### 1.2 Frontend Environment Variables (`frontend/.env.local`)

| Variable Name | Scope / Tier | Required? | Default / Example | Purpose & Source |
| :--- | :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Frontend | Yes | `http://localhost:8000/api/v1` | Base REST API endpoint for backend communications. |
| `VITE_SUPABASE_URL` | Frontend | Yes | `https://xyzproject.supabase.co` | Supabase project URL for Realtime WebSocket connection. |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Yes | `eyJhbGciOi...` | Public anon key for client-side Supabase client. |
| `VITE_ENABLE_REALTIME` | Frontend | No | `true` | Boolean flag to enable WebSocket live queue updates. |
| `VITE_APP_ENV` | Frontend | No | `development` | Label shown in header environment badge. |

---

## 2. Configuration Setup by Platform

### 2.1 Local Development Setup

1. **Backend:**
   ```bash
   cd backend
   cp ../.env.example .env
   # Edit .env and paste your Supabase keys
   ```

2. **Frontend:**
   ```bash
   cd frontend
   cp ../.env.example .env.local
   # Ensure VITE_API_BASE_URL is set to http://localhost:8000/api/v1
   ```

---

### 2.2 Cloud Hosting Deployment

#### A. Backend on Render (`Web Service`)
Under **Environment Variables** in Render Dashboard:
- `ENVIRONMENT`: `production`
- `PORT`: `10000`
- `CORS_ORIGINS`: `https://sehatsetu.vercel.app`
- `SUPABASE_URL`: `https://<your-project>.supabase.co`
- `SUPABASE_ANON_KEY`: `<your-anon-key>`
- `SUPABASE_SERVICE_ROLE_KEY`: `<your-service-role-key>`
- `DATABASE_URL`: `<your-supabase-db-connection-string>`
- `SUPABASE_JWT_SECRET`: `<your-jwt-secret>`
- `ENABLE_AI_SUMMARIZATION`: `true` (if Gemini key provided)
- `GEMINI_API_KEY`: `<your-gemini-key>`

#### B. Frontend on Vercel (`Project Settings -> Environment Variables`)
- `VITE_API_BASE_URL`: `https://sehatsetu-api.onrender.com/api/v1`
- `VITE_SUPABASE_URL`: `https://<your-project>.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: `<your-anon-key>`
- `VITE_ENABLE_REALTIME`: `true`
- `VITE_APP_ENV`: `production`

---

## 3. Common Troubleshooting Scenarios

### Error 1: `CORS Policy: No 'Access-Control-Allow-Origin' header present`
- **Cause:** `CORS_ORIGINS` on the backend does not match the frontend origin URL.
- **Fix:** Update `CORS_ORIGINS` in `backend/.env` or Render settings to include `http://localhost:5173` and `https://sehatsetu.vercel.app`.

### Error 2: `Invalid API Key or JWT Signature Verification Failed`
- **Cause:** `SUPABASE_JWT_SECRET` in backend does not match the JWT secret in Supabase Project Settings -> API -> JWT Settings.
- **Fix:** Copy the exact JWT Secret from Supabase and restart the backend server.

### Error 3: Realtime Queue Not Updating Automatically
- **Cause:** `VITE_ENABLE_REALTIME` is `false` or Supabase Realtime publication is not enabled on `visits` table.
- **Fix:** Ensure `ALTER PUBLICATION supabase_realtime ADD TABLE visits;` has been executed in the Supabase SQL editor.
