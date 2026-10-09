# Hackathon 2-Minute Demo Presentation Script — SehatSetu

> **Target Time:** 120 Seconds (2 Minutes)  
> **Audience:** Hackathon Judges, Clinicians, & Technical Reviewers  
> **Demo Data:** Strictly Synthetic Patient Fixtures

---

## 1. Quick Setup Checklist Before Pitching

- [ ] Open Browser Tab 1: **Intake / Triage Desk** (`/intake`)
- [ ] Open Browser Tab 2: **Doctor Queue View** (`/queue?department=Emergency`)
- [ ] Open Browser Tab 3: **Hospital Analytics Dashboard** (`/analytics`)
- [ ] Ensure pre-seeded synthetic patients exist (e.g. 2 Moderate patients waiting for 30 minutes).

---

## 2. Minute-by-Minute Pitch & Walkthrough

### ⏱️ [00:00 - 00:25] The Hook & Problem Statement
- **Presenter Action:** Show the crowded waiting room slide or open the Doctor Queue View.
- **Spoken Script:**
  > *"Every day in public hospital emergency rooms and OPDs, patients are queued strictly first-come, first-served. A patient with impending myocardial infarction or severe hypoxia often waits behind dozens of routine checkups. 
  > This is **SehatSetu** — an intelligent, clinical-support queue management platform that pairs rapid digital intake with deterministic, explainable triage prioritization."*

---

### ⏱️ [00:25 - 00:55] Rapid Intake & Explainable Triage Rules
- **Presenter Action:** Switch to Tab 1 (`/intake`). Click "Quick Fill: Critical Cardiac Case" (or type: *Aarav Sharma, 48M, Chest pain radiating to arm, SpO2: 91%, BP: 165/102, HR: 118*).
- **Spoken Script:**
  > *"Watch how quickly intake happens. In under 30 seconds, the nurse enters vital signs and chief complaints. Immediately, our deterministic triage engine evaluates physiological thresholds. 
  > Notice that this is **not a black-box AI guessing a diagnosis**. It clearly explains why this patient is categorized as **CRITICAL**: SpO2 under 92%, hypertensive crisis, and cardiac red-flag keywords."*
- **Presenter Action:** Click **"Save & Enqueue Patient"**.

---

### ⏱️ [00:55 - 01:25] Real-Time Dynamic Queue & Doctor Workflow
- **Presenter Action:** Switch to Tab 2 (`/queue`). Point out that *Aarav Sharma* instantly appeared at **Rank #1**, rising above patients who arrived 30 minutes earlier.
- **Spoken Script:**
  > *"Without refreshing the page, Supabase Realtime updates the physician's screen. Even though other patients arrived earlier, Aarav is dynamically prioritized at the top of the queue.
  > The doctor clicks **'Call Patient'** — which executes an atomic database lock to prevent double-calling. In the patient review modal, our extractive AI service provides a concise 2-bullet summary of the symptoms without hallucinating diagnoses. The doctor starts the consultation and marks it complete with one click."*

---

### ⏱️ [01:25 - 02:00] Operational Analytics & Safety Governance
- **Presenter Action:** Switch to Tab 3 (`/analytics`). Show live KPI counters and department wait-time graphs updating.
- **Spoken Script:**
  > *"Hospital leadership gets complete operational visibility: live average wait times, active department loads, and an immutable audit trail of every status transition and priority override.
  > Most importantly: SehatSetu respects clinical boundaries. It empowers human healthcare workers with transparent decision support rather than trying to replace them. 
  > Thank you — we are ready for your questions!"*

---

## 3. Synthetic Demo Patient Profiles

| Patient Name | Age/Gender | Chief Complaint | Key Vitals | Expected Category |
| :--- | :--- | :--- | :--- | :--- |
| **Aarav Sharma** | 48 M | Acute crushing substernal chest pain radiating to left arm | BP: 165/102, HR: 118, SpO2: 91% | `CRITICAL` (Score: 95) |
| **Sunita Devi** | 62 F | High grade fever for 3 days with persistent vomiting & lethargy | Temp: 102.8°F, HR: 112, BP: 110/70 | `HIGH` (Score: 75) |
| **Rajesh Patel** | 35 M | Chronic lumbar back strain after heavy lifting, stable | HR: 74, BP: 122/80, SpO2: 99% | `LOW` (Score: 20) |
