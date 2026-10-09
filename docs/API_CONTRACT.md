# API Contract Specification — SehatSetu

> **Base URL:** `http://localhost:8000/api/v1` (Development) / `https://sehatsetu-api.onrender.com/api/v1` (Production)  
> **Protocol:** HTTPS / REST  
> **Content-Type:** `application/json`  
> **Authentication:** Bearer JWT in `Authorization` header (`Authorization: Bearer <token>`)

---

## 1. Standard Response & Error Formats

### 1.1 Success Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2026-10-09T11:30:00Z",
    "request_id": "req-98fbc-12a"
  }
}
```

### 1.2 Error Response Schema (RFC 7807 Format)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid vital sign range provided",
    "details": [
      {
        "field": "vital_observations.spo2",
        "issue": "SpO2 value must be between 0 and 100 percent"
      }
    ]
  },
  "meta": {
    "timestamp": "2026-10-09T11:30:00Z",
    "request_id": "req-err-44b"
  }
}
```

---

## 2. API Endpoints Summary

| Method | Endpoint | Description | Auth Roles |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Service health & database connectivity check | Public |
| `GET` | `/departments` | List all active hospital departments | Authenticated |
| `POST` | `/patients/intake` | Register patient, record vitals & calculate triage | Registration, Nurse, Doctor, Admin |
| `GET` | `/patients` | Search & list patients by UHID, name, or phone | Authenticated |
| `GET` | `/visits/{visit_id}` | Retrieve complete visit, vitals & triage details | Authenticated |
| `POST` | `/triage/evaluate` | Dry-run triage rule calculation without persisting | Nurse, Doctor, Admin |
| `GET` | `/queue` | Get live prioritized patient queue by department | Authenticated |
| `POST` | `/queue/call-next` | Atomically call the highest priority waiting patient | Doctor, Admin |
| `PATCH` | `/visits/{visit_id}/status` | Update visit status (`CALLED`, `IN_CONSULTATION`, etc.) | Doctor, Nurse, Admin |
| `POST` | `/triage/{visit_id}/override` | Manually override triage urgency with audited reason | Doctor, Nurse, Admin |
| `GET` | `/analytics/overview` | Hospital-wide & department patient flow analytics | Authenticated |
| `GET` | `/audit/logs` | Query audit trail for a visit or department | Admin, Doctor |
| `POST` | `/ai/summarize-symptoms` | Optional extractive symptom summarizer | Authenticated |

---

## 3. Detailed Endpoint Contracts

### 3.1 Patient Intake & Registration
**`POST /api/v1/patients/intake`**  
Creates a patient record (or links existing by UHID), creates a new `visit` record, runs the preliminary triage engine, and assigns a queue priority.

#### Request Body
```json
{
  "full_name": "Aarav Sharma",
  "age": 48,
  "gender": "MALE",
  "phone_number": "+91-9876543210",
  "emergency_contact_phone": "+91-9876543211",
  "address": "B-42, Sector 14, Noida, UP",
  "department_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "chief_complaint": "Acute severe substernal chest pain radiating to left arm for 45 minutes, accompanied by diaphoresis and shortness of breath.",
  "vital_observations": {
    "systolic_bp": 165,
    "diastolic_bp": 102,
    "heart_rate": 118,
    "respiratory_rate": 26,
    "spo2": 91,
    "temperature_f": 98.6,
    "blood_glucose_mg_dl": 180,
    "gcs": 15
  }
}
```

#### Response Body (`201 Created`)
```json
{
  "success": true,
  "data": {
    "patient": {
      "id": "c1f72a4e-1234-5678-9abc-def012345678",
      "uhid": "SS-2026-0412",
      "full_name": "Aarav Sharma",
      "age": 48,
      "gender": "MALE"
    },
    "visit": {
      "id": "e4a2c1d0-9988-7766-5544-33221100aabb",
      "department_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "status": "WAITING",
      "arrival_time": "2026-10-09T11:25:00Z"
    },
    "triage_assessment": {
      "urgency_category": "CRITICAL",
      "urgency_score": 95,
      "rule_evidence": [
        "Oxygen Saturation (SpO2) < 92% (recorded: 91%)",
        "Severe Tachycardia: Heart Rate > 110 bpm (recorded: 118 bpm)",
        "High Risk Symptom Trigger: Chest pain radiating to arm / diaphoresis",
        "Hypertensive Crisis Alert: Systolic BP > 160 mmHg (recorded: 165 mmHg)"
      ],
      "missing_vital_flags": [],
      "is_overridden": false
    },
    "queue_position": 1
  },
  "message": "Patient registered and triage assessment completed successfully"
}
```

---

### 3.2 Dynamic Queue Retrieval
**`GET /api/v1/queue?department_id={dept_id}&status=WAITING`**

#### Query Parameters:
- `department_id` (UUID, optional): Filter by department.
- `status` (string, optional, default: `WAITING`): Filter by visit status.
- `limit` (integer, default: 50): Number of entries.

#### Response Body (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "visit_id": "e4a2c1d0-9988-7766-5544-33221100aabb",
      "patient_id": "c1f72a4e-1234-5678-9abc-def012345678",
      "uhid": "SS-2026-0412",
      "full_name": "Aarav Sharma",
      "age": 48,
      "gender": "MALE",
      "urgency_category": "CRITICAL",
      "urgency_score": 95,
      "status": "WAITING",
      "arrival_time": "2026-10-09T11:25:00Z",
      "waiting_duration_minutes": 8,
      "calculated_priority_rank": 10080,
      "chief_complaint": "Acute severe substernal chest pain radiating to left arm...",
      "rule_evidence_count": 4
    },
    {
      "visit_id": "f5b3d2e1-1122-3344-5566-77889900ccdd",
      "patient_id": "d2e83b5f-5678-9abc-def0-123456789abc",
      "uhid": "SS-2026-0409",
      "full_name": "Sunita Devi",
      "age": 62,
      "gender": "FEMALE",
      "urgency_category": "HIGH",
      "urgency_score": 75,
      "status": "WAITING",
      "arrival_time": "2026-10-09T11:05:00Z",
      "waiting_duration_minutes": 28,
      "calculated_priority_rank": 5280,
      "chief_complaint": "High grade fever for 3 days with persistent vomiting and dizziness.",
      "rule_evidence_count": 2
    }
  ]
}
```

---

### 3.3 Atomic "Call Next" Operation
**`POST /api/v1/queue/call-next`**  
Atomically claims the top priority waiting patient for the calling physician.

#### Request Body
```json
{
  "department_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "room_or_desk": "OPD Room 4"
}
```

#### Response Body (`200 OK`)
```json
{
  "success": true,
  "data": {
    "visit_id": "e4a2c1d0-9988-7766-5544-33221100aabb",
    "uhid": "SS-2026-0412",
    "patient_name": "Aarav Sharma",
    "status": "CALLED",
    "called_at": "2026-10-09T11:33:15Z",
    "doctor_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "room_or_desk": "OPD Room 4"
  },
  "message": "Patient called successfully"
}
```

---

### 3.4 Visit Status Transition
**`PATCH /api/v1/visits/{visit_id}/status`**

#### Request Body
```json
{
  "status": "IN_CONSULTATION",
  "notes": "Patient seated in consultation chamber."
}
```

#### Response Body (`200 OK`)
```json
{
  "success": true,
  "data": {
    "visit_id": "e4a2c1d0-9988-7766-5544-33221100aabb",
    "status": "IN_CONSULTATION",
    "consultation_started_at": "2026-10-09T11:35:00Z"
  }
}
```

---

### 3.5 Priority Override with Audit
**`POST /api/v1/triage/{visit_id}/override`**

#### Request Body
```json
{
  "override_category": "CRITICAL",
  "override_reason": "Clinical presentation indicates severe diaphoresis and pale extremities not fully captured by baseline vitals."
}
```

#### Response Body (`200 OK`)
```json
{
  "success": true,
  "data": {
    "visit_id": "e4a2c1d0-9988-7766-5544-33221100aabb",
    "previous_category": "HIGH",
    "new_category": "CRITICAL",
    "is_overridden": true,
    "override_reason": "Clinical presentation indicates severe diaphoresis and pale extremities...",
    "updated_at": "2026-10-09T11:36:00Z"
  }
}
```

---

### 3.6 Hospital Overview Analytics
**`GET /api/v1/analytics/overview`**

#### Response Body (`200 OK`)
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_registered_today": 142,
      "currently_waiting": 38,
      "in_consultation": 12,
      "completed_today": 92,
      "average_wait_time_minutes": 21.4
    },
    "urgency_distribution": {
      "CRITICAL": 4,
      "HIGH": 12,
      "MODERATE": 18,
      "LOW": 4,
      "NEEDS_REVIEW": 0
    },
    "department_load": [
      {
        "department_name": "Emergency",
        "waiting": 8,
        "avg_wait_minutes": 6.2
      },
      {
        "department_name": "General Medicine",
        "waiting": 22,
        "avg_wait_minutes": 31.0
      },
      {
        "department_name": "Pediatrics",
        "waiting": 8,
        "avg_wait_minutes": 18.5
      }
    ]
  }
}
```

---

### 3.7 Optional AI Symptom Summarization
**`POST /api/v1/ai/summarize-symptoms`**

#### Request Body
```json
{
  "chief_complaint": "Patient states that 3 days ago they started having intermittent dry cough, which progressed yesterday to high fevers with chills, severe breathlessness when climbing stairs, and occasional sharp pleuritic right-sided chest pain."
}
```

#### Response Body (`200 OK`)
```json
{
  "success": true,
  "data": {
    "summary": "• Onset: 3-day history of dry cough and progressive high fever with chills.\n• Current symptoms: Severe exertional dyspnea and sharp right pleuritic chest pain.\n• Clinical note: Extractive summary for doctor review; no autonomous diagnosis.",
    "is_ai_generated": true,
    "model": "gemini-1.5-flash"
  }
}
```
