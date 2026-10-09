# Implementation Roadmap & Sprint Plan — SehatSetu

> **Document Version:** 1.0.0  
> **Target Timeline:** 2-Hour Rapid Hackathon Sprint & Long-Term Production Roadmap

---

## 1. Master Implementation Phases Overview

```mermaid
gantt
    title SehatSetu Development Progression
    dateFormat  X
    axisFormat %s

    section Core MVP
    Phase 1: Project Scaffolding & Setup        :p1, 0, 15
    Phase 2: Database & Patient Intake         :p2, 15, 40
    Phase 3: Deterministic Triage Engine       :p3, 40, 60
    Phase 4: Dynamic Queue & Status Flow       :p4, 60, 80

    section Extensions & Polish
    Phase 5: Staff Dashboard & Analytics       :p5, 80, 100
    Phase 6: Optional AI Summarization         :p6, 100, 108
    Phase 7: Testing, Realtime & Deployment    :p7, 108, 120
```

---

## 2. Realistic 2-Hour Hackathon Execution Plan

| Time Window | Focus Milestone | Concrete Tasks | Deliverables & Verification |
| :--- | :--- | :--- | :--- |
| **00:00 – 00:15** | **Phase 1: Scaffolding & Startup** | 1. Initialize `frontend/` (Vite+React+TS+Tailwind).<br>2. Initialize `backend/` (FastAPI+Pydantic).<br>3. Verify both servers run locally. | Frontend renders landing shell; Backend returns `200 OK` on `/health`. |
| **00:15 – 00:40** | **Phase 2: Database & Registration** | 1. Run Supabase SQL migrations for tables (`departments`, `patients`, `visits`, `triage_assessments`).<br>2. Implement `POST /api/v1/patients/intake`.<br>3. Build React intake form with validation. | Patient intake form registers synthetic patient and writes records to database. |
| **00:40 – 01:00** | **Phase 3: Triage Rules Engine** | 1. Implement deterministic rule engine in Python.<br>2. Evaluate vital thresholds + red-flag keywords.<br>3. Return score, category (`CRITICAL`, `HIGH`, etc.), and evidence array.<br>4. Display live triage preview in UI. | Entering SpO2=88% immediately flags as `CRITICAL` with evidence string shown on screen. |
| **01:00 – 01:20** | **Phase 4: Dynamic Queue & Status** | 1. Implement server-sorted `GET /api/v1/queue`.<br>2. Build React Queue Table with urgency color badges.<br>3. Implement `POST /api/v1/queue/call-next` and status change buttons (`CALLED` $\rightarrow$ `IN_CONSULTATION` $\rightarrow$ `COMPLETED`). | Top urgent patient displays at #1; clicking "Call Next" updates status and refreshes list. |
| **01:20 – 01:40** | **Phase 5: Dashboard & AI Summary** | 1. Implement `/api/v1/analytics/overview` endpoint and Recharts summary widgets.<br>2. Implement optional Gemini symptom summarizer endpoint with extractive prompt.<br>3. Add "AI Clinical Summary" card in patient view. | Analytics cards show active counts & wait times; Doctor review modal displays formatted symptom bullets. |
| **01:40 – 01:55** | **Phase 6: Verification & Edge Cases** | 1. Run integration tests for queue sorting & triage rules.<br>2. Test error handling on missing vitals.<br>3. Test fallback when AI API key is disabled. | All pytest suites pass; UI gracefully handles invalid inputs and network dropouts. |
| **01:55 – 02:00** | **Phase 7: Demo Preparation** | 1. Seed 6 realistic synthetic patient scenarios (1 Critical, 2 High, 2 Moderate, 1 Low).<br>2. Verify presentation walkthrough according to `DEMO_SCRIPT.md`. | Complete vertical slice ready for 2-minute judge demonstration. |

---

## 3. Detailed Phase Breakdown & Acceptance Criteria

### Phase 1: Repository Scaffolding & Configuration
- **Tasks:**
  - Create standard folder structures under `frontend/` and `backend/`.
  - Configure `vite.config.ts`, `tailwind.config.js`, `tsconfig.json`.
  - Configure FastAPI `app/main.py`, CORS middleware, and Pydantic base settings.
- **Verification:**
  - Run `npm run build` in `frontend/` without errors.
  - Run `uvicorn app.main:app` and test `GET /health` responding `{"status": "ok"}`.

### Phase 2: Database Schema & Patient Intake
- **Tasks:**
  - Create Supabase migration file `supabase/migrations/001_initial_schema.sql`.
  - Build Pydantic schemas: `PatientCreate`, `VitalObservations`, `IntakeRequest`, `IntakeResponse`.
  - Build React intake form using `react-hook-form` and `zod`.
- **Acceptance Criteria:**
  - Submitting the form persists records in `patients`, `visits`, and `triage_assessments`.

### Phase 3: Deterministic Triage Rules Engine
- **Tasks:**
  - Build `app/services/triage_engine.py` with pure functions.
  - Implement rule matrix: SpO2, Heart Rate, BP, Respiratory Rate, GCS, Temperature, Glucose, and Red-Flag symptoms.
  - Return explainable `rule_evidence` strings.
- **Acceptance Criteria:**
  - Unit tests in `test_triage_engine.py` pass for all boundary conditions.

### Phase 4: Dynamic Queue & Status Transitions
- **Tasks:**
  - Implement dynamic SQL ordering formula combining urgency score and elapsed wait minutes.
  - Build `/api/v1/queue` endpoint with filtering by department.
  - Implement `/api/v1/queue/call-next` and `/api/v1/visits/{id}/status`.
  - Build React Queue interface with color-coded urgency badges and action buttons.
- **Acceptance Criteria:**
  - Patients are ordered strictly by urgency; clicking status transitions updates the UI immediately.

### Phase 5: Dashboard Analytics & Operational Reporting
- **Tasks:**
  - Aggregate real data from `visits` table for counts and average wait time calculations.
  - Build Recharts visualizations for urgency distribution and department workload.
- **Acceptance Criteria:**
  - Dashboard displays real stored metrics without hardcoded numbers.

### Phase 6: Optional AI Symptom Summarizer
- **Tasks:**
  - Integrate Google Gemini API with extractive prompt and strict temperature (0.0).
  - Add graceful fallback returning raw symptoms if key is missing or call fails.
- **Acceptance Criteria:**
  - Formatted bullet points appear on doctor consultation view when enabled.

### Phase 7: Realtime, Security Hardening & Deployment
- **Tasks:**
  - Enable Supabase Realtime channel subscription in React frontend.
  - Deploy backend to Render and frontend to Vercel.
  - Verify HTTPS and environment variables.
- **Acceptance Criteria:**
  - Adding a patient in one browser tab instantly appears on the doctor's screen in another tab.
