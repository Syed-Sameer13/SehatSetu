# UI / UX Design & Component Specification — SehatSetu

> **Document Version:** 1.0.0  
> **Target Framework:** React 18, Vite, Tailwind CSS, shadcn/ui, Lucide Icons, Recharts

---

## 1. Design System & Visual Hierarchy

### 1.1 Color Palette & Clinical Semantics
Color coding must convey urgency instantly while remaining legible and adhering to WCAG 2.1 AA contrast ratios (minimum 4.5:1 for normal text).

| Semantic Role | Urgency / Status | Tailwind Class | Hex Value | UI Application |
| :--- | :--- | :--- | :--- | :--- |
| **Emergency** | `CRITICAL` | `bg-red-600 text-white` | `#DC2626` | Urgent badge, border highlight, top queue flashing pill |
| **High Urgency** | `HIGH` | `bg-orange-500 text-white` | `#F97316` | High priority badges, warning borders |
| **Moderate** | `MODERATE` | `bg-amber-400 text-slate-900` | `#FBBF24` | Moderate badges, caution banners |
| **Low / Routine** | `LOW` | `bg-emerald-600 text-white` | `#059669` | Stable indicators, completed visits |
| **Review Required**| `NEEDS_REVIEW` | `bg-purple-600 text-white` | `#7C3AED` | Incomplete vitals alert badge |
| **Primary Theme** | Brand Primary | `bg-teal-700 text-white` | `#0F766E` | Main navigation, primary action buttons |
| **Neutral Canvas** | Background | `bg-slate-50 text-slate-900` | `#F8FAFC` | Main app background canvas |
| **Card Surface** | Surface / Card | `bg-white border-slate-200` | `#FFFFFF` | Content cards, tables, modal dialogs |

### 1.2 Typography & Spacing
- **Font Family:** `Inter`, system sans-serif.
- **Scale:**
  - Headers: `text-2xl font-bold tracking-tight` (Page titles), `text-lg font-semibold` (Card headers)
  - Body: `text-sm font-normal text-slate-700` (Standard data), `text-xs text-slate-500` (Timestamps/metadata)
  - Badges/Pills: `text-xs font-bold uppercase tracking-wider`
- **Spacing:** Standard Tailwind 4px scale (`p-4`, `p-6`, `gap-4`).

---

## 2. Global Navigation & Layout Architecture

```text
+---------------------------------------------------------------------------------------------------+
|  [+] SehatSetu (सेहत सेतु)    [Live Queue: 38]   [Emergency Alert: 2 Critical]     (User: Dr. Rajesh) |
+---------------------------------------------------------------------------------------------------+
| [Sidebar Navigation]         | [Main Active Workspace Content]                                    |
|                              |                                                                   |
|   [*] Dashboard Overview     |   [Header / Quick Action Bar]                                      |
|   [+] New Patient Intake     |   +-------------------------------------------------------------+  |
|   [=] Live Patient Queue     |   | Dynamic Queue Filters: [All] [Emergency] [Gen Med] [Pediat] |  |
|   [%] Hospital Analytics     |   +-------------------------------------------------------------+  |
|   [#] Audit Logs             |   | [Priority Ranked Patient Cards or Table View]               |  |
|                              |   |                                                             |  |
|   [?] Clinical Safety Notice |   |                                                             |  |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Screen Specifications & Layouts

### 3.1 Staff Login (`/login`)
- **Purpose:** Secure role-based staff authentication via Supabase Auth (Email/Password or PIN).
- **Key Elements:**
  - Hospital logo, title, and environment indicator (`Development / Mock Mode`).
  - Email and password inputs with inline validation.
  - "Demo Quick-Fill" buttons for fast evaluation during hackathon judging (e.g. *Login as Triage Nurse*, *Login as ER Doctor*).

---

### 3.2 Patient Registration & Intake Form (`/intake`)
- **Purpose:** Rapid data entry of patient demographics, chief complaints, and objective vital observations.

```text
+---------------------------------------------------------------------------------------------------+
|  New Patient Registration & Triage Intake                                                         |
+---------------------------------------------------------------------------------------------------+
| 1. Demographics & Intake Desk                                                                     |
|    Full Name: [ Aarav Sharma                     ]   Age: [ 48 ]   Gender: (o) Male ( ) Female    |
|    Phone:     [ +91 98765 43210                  ]   Dept: [ Emergency Department (ER)          v]|
+---------------------------------------------------------------------------------------------------+
| 2. Symptoms & Chief Complaints                                                                    |
|    [ Acute severe substernal chest pain radiating to left arm for 45 mins with diaphoresis...   ] |
|    [ (AI Summary Preview Available) ]                                                             |
+---------------------------------------------------------------------------------------------------+
| 3. Vital Sign Observations (Auto-evaluated in real time)                                          |
|    BP (mmHg):    [ 165 ] / [ 102 ]   Heart Rate (bpm): [ 118 ]   SpO2 (%):    [ 91  ] (!) Low    |
|    Resp Rate:    [ 26  ]             Temp (deg F):     [ 98.6]   Glucose:     [ 180 ]             |
+---------------------------------------------------------------------------------------------------+
| 4. Live Triage Preview:  [ CRITICAL - Score: 95/100 ]                                             |
|    Triggered Rules:                                                                               |
|    * Oxygen Saturation < 92% (recorded: 91%)                                                      |
|    * Severe Tachycardia: Heart Rate > 110 bpm                                                     |
|    * High Risk Symptom Trigger: Chest pain radiating to arm                                       |
+---------------------------------------------------------------------------------------------------+
|                                            [ Clear Form ]   [ Save & Enqueue Patient (Ctrl+Enter) ]|
+---------------------------------------------------------------------------------------------------+
```

---

### 3.3 Dynamic Patient Queue View (`/queue`)
- **Purpose:** Central command center for triage nurses and doctors to manage waiting patients.

```text
+---------------------------------------------------------------------------------------------------+
|  Live Department Queue — Emergency Department                [+ Register Patient]  [Auto-Sync: ON]|
+---------------------------------------------------------------------------------------------------+
|  Filter: [ All (14) ] [ Critical (2) ] [ High (4) ] [ Moderate (6) ] [ Low (2) ]                   |
+---------------------------------------------------------------------------------------------------+
|  RANK | UHID         | PATIENT NAME & AGE | URGENCY    | WAIT TIME | ACTIONS                     |
+-------+--------------+--------------------+------------+-----------+-----------------------------+
|  #1   | SS-2026-0412 | Aarav Sharma (48M) | [CRITICAL] | 8 mins    | [ Call Next ] [ View Vitals]|
|  #2   | SS-2026-0409 | Sunita Devi (62F)  | [HIGH]     | 28 mins   | [ Call Next ] [ View Vitals]|
|  #3   | SS-2026-0405 | Rajesh Patel (35M) | [MODERATE] | 42 mins   | [ Call Next ] [ View Vitals]|
|  #4   | SS-2026-0401 | Meera Khan (24F)   | [LOW]      | 15 mins   | [ Call Next ] [ View Vitals]|
+---------------------------------------------------------------------------------------------------+
```

---

### 3.4 Patient Details & Consultation Modal (`/patients/{id}`)
- **Purpose:** Full clinical review card when doctor opens or calls a patient.
- **Key Features:**
  - Complete vital signs grid with abnormal values highlighted in red/amber.
  - Triage rule breakdown and evidence explanation list.
  - Optional AI symptom bulleted summary.
  - Status transition action buttons: `[Start Consultation]`, `[Transfer Department]`, `[Mark Completed]`, `[Override Priority]`.

---

### 3.5 Operational Analytics Dashboard (`/analytics`)
- **Purpose:** Real-time throughput and waiting-time visualization for hospital supervisors.
- **Key Charts (Recharts):**
  - **KPI Cards:** Total Registered Today, Active Waiting, In Consultation, Average Waiting Time (mins).
  - **Urgency Breakdown (Donut Chart):** Distribution of CRITICAL vs HIGH vs MODERATE vs LOW cases.
  - **Wait Time by Department (Bar Chart):** Comparing Emergency vs General Medicine vs Pediatrics.
  - **Hourly Arrival Trend (Area Chart):** Patient intake volume across morning, afternoon, and evening shifts.

---

## 4. UI States & Interaction Rules

### 4.1 Loading States
- Use skeleton loaders (`<Skeleton className="h-12 w-full" />`) matching table rows and cards rather than blocking spinners.

### 4.2 Empty States
- When a department queue is empty: Display a clear, reassuring icon (`CheckCircle2`), message *"No patients currently waiting in this department"*, and a quick button to *Register Intake*.

### 4.3 Error States
- Network or validation errors must render friendly, dismissible toast notifications with specific troubleshooting instructions.

### 4.4 Keyboard Accessibility
- `Ctrl + Enter` / `Cmd + Enter`: Submit registration form.
- `Esc`: Close modals and drawers.
- Tab navigation follows natural visual flow across form fields.
