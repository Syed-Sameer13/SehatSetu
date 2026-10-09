import math
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from app.services.storage import store


class RAGDocument(BaseModel):
    id: str
    title: str
    category: str  # PATIENT_RECORD, DEPARTMENT_SNAPSHOT, DEPARTMENT_DIRECTORY, TRIAGE_PROTOCOL, VITALS_REFERENCE, HOSPITAL_FACILITY, EMERGENCY_HOTLINE, VISIT_CHECKLIST, CLINICAL_SAFETY
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RetrievedChunk(BaseModel):
    document: RAGDocument
    similarity_score: float
    matched_terms: List[str] = Field(default_factory=list)


# Static Grounded Hospital Knowledge Chunks
STATIC_HOSPITAL_DOCUMENTS: List[RAGDocument] = [
    RAGDocument(
        id="DOC-FACILITY-001",
        title="Civil Hospital Ward A - Facility & Operating Hours",
        category="HOSPITAL_FACILITY",
        content=(
            "Facility: Civil Hospital, Ward A.\n"
            "• Emergency Department (ER): Operates 24 hours a day, 7 days a week (24x7) on the Ground Floor.\n"
            "• Outpatient Department (OPD): Registration and consultation hours are Monday through Saturday, 8:00 AM to 4:00 PM.\n"
            "• Hospital General Helpdesk Phone: 011-2399-4400.\n"
            "• Pharmacy: Ground Floor adjacent to Emergency Entrance (Open 24x7 for urgent medications).\n"
            "• Diagnostic Pathology Lab & Blood Collection: Room 103, Ground Floor (8:00 AM - 6:00 PM).\n"
            "• Wheelchair & Stretcher Assistance: Available at Main Reception Entrance Gate 1.\n"
            "• Cafeteria & Attendant Refreshments: Basement Wing B."
        ),
        metadata={"facility": "Civil Hospital", "ward": "Ward A", "hours": "24x7 ER, 8am-4pm OPD", "pharmacy": "Ground Floor", "lab": "Room 103"},
    ),
    RAGDocument(
        id="DOC-DEPTS-002",
        title="Hospital Departments & Consultation Room Directory",
        category="DEPARTMENT_DIRECTORY",
        content=(
            "Specialty Department and Consultation Room Directory (Ward A):\n"
            "1. Emergency Department (ER): Rooms 101 & 102 (Ground Floor, 24x7 Open). Handles acute trauma, severe hypoxia, cardiac chest pain, acute stroke alerts, and severe distress.\n"
            "2. General Medicine (OPD): Rooms 104 & 105 (First Floor). Handles viral fever, acute infections, routine health checkups, hypertension, diabetes follow-up, and internal medicine.\n"
            "3. Cardiology: Room 108 (First Floor). Handles ECG diagnostics, blood pressure monitoring, chest discomfort evaluations, and cardiac follow-ups.\n"
            "4. Orthopedics: Room 112 (Second Floor). Handles bone fractures, sprains, joint pain, arthritis, and musculoskeletal injuries.\n"
            "5. Pediatrics: Room 115 (Second Floor). Handles child health, pediatric fever, infant growth monitoring, and pediatric vaccinations.\n"
            "• Location guidance: Elevators and stairwells are situated right next to the central reception atrium."
        ),
        metadata={"rooms": {"ER": "101/102", "GEN_MED": "104/105", "CARDIO": "108", "ORTHO": "112", "PEDIATRIC": "115"}},
    ),
    RAGDocument(
        id="DOC-TRIAGE-003",
        title="Deterministic Clinical Triage Rules & Queue Prioritization",
        category="TRIAGE_PROTOCOL",
        content=(
            "SehatSetu Deterministic Triage Prioritization Protocol:\n"
            "Patients in the queue are ordered dynamically by Clinical Urgency Score and Arrival Duration:\n"
            "• Why was someone called before me? Patients with life-threatening vitals (e.g. critically low oxygen, severe tachycardia, acute chest distress) receive higher triage urgency scores and must be attended to immediately by doctors to save lives.\n"
            "• Urgency Categories:\n"
            "  1. CRITICAL: Urgency Score 90-100. Immediate doctor evaluation (e.g., SpO2 < 90%, GCS ≤ 8, severe cardiac distress, unresponsive).\n"
            "  2. HIGH: Urgency Score 70-89. Urgent care indicated, ~10-15 min estimated wait (e.g., SpO2 90-93%, Heart Rate > 120 bpm, high fever with severe pain).\n"
            "  3. MODERATE: Urgency Score 40-69. Standard care indicated, ~25-40 min estimated wait (e.g., Heart Rate 100-120 bpm, persistent fever, moderate pain).\n"
            "  4. LOW: Urgency Score 10-39. Routine outpatient care, ~45-60 min estimated wait (e.g., mild sprains, stable vitals, routine prescription refill).\n"
            "  5. NEEDS_REVIEW: Pending clinician vitals or nurse review."
        ),
        metadata={"protocol": "Deterministic Triage Algorithm", "weights": {"CRITICAL": 2000, "HIGH": 1500, "MODERATE": 1000, "LOW": 500}},
    ),
    RAGDocument(
        id="DOC-VITALS-004",
        title="Standard Clinical Baseline Vital Signs Reference",
        category="VITALS_REFERENCE",
        content=(
            "Baseline Clinical Vital Sign Normal Ranges (For Educational Reference Only):\n"
            "• Oxygen Saturation (SpO2): Normal is 95% - 100%. Values below 92% trigger rapid urgent clinician alert.\n"
            "• Pulse / Resting Heart Rate: Normal is 60 - 100 beats per minute (bpm). Resting rates > 100 indicate tachycardia; rates > 120 are flagged high urgency.\n"
            "• Blood Pressure (BP): Normal baseline is ~120/80 mmHg (Systolic 90-130 / Diastolic 60-85 mmHg).\n"
            "• Body Temperature: Normal baseline is 97.8°F - 99.1°F (36.5°C - 37.3°C). Fever is defined as > 100.4°F (38°C).\n"
            "• Respiratory Rate: Normal is 12 - 20 breaths per minute.\n"
            "• Blood Glucose: Normal fasting is 70 - 110 mg/dL, random < 140 mg/dL.\n"
            "• Glasgow Coma Scale (GCS): Normal baseline is 15/15."
        ),
        metadata={"ranges": {"spo2": "95-100%", "hr": "60-100", "bp": "120/80", "temp": "98.6F"}},
    ),
    RAGDocument(
        id="DOC-CALLING-005",
        title="Audio Chime, SMS Notifications & Patient Calling Workflow",
        category="VISIT_CHECKLIST",
        content=(
            "Patient Calling & Notification System:\n"
            "1. When the duty physician calls a patient's turn, an audible hospital chime (ding-dong) rings across Ward A waiting areas.\n"
            "2. An automated real-time SMS alert is dispatched to the patient's registered mobile phone with the assigned room number.\n"
            "3. The patient's Live Token Pass status updates to CALLED with the designated Consultation Room.\n"
            "4. The patient must proceed directly to the designated Consultation Room when CALLED."
        ),
        metadata={"chime": True, "sms": True},
    ),
    RAGDocument(
        id="DOC-CHECKLIST-006",
        title="Patient Registration & Consultation Document Checklist",
        category="VISIT_CHECKLIST",
        content=(
            "What to bring and prepare for hospital consultation:\n"
            "1. Printed UHID Token slip or SMS digital pass on your phone.\n"
            "2. Government Identification (Aadhaar Card, Ayushman Bharat PM-JAY card, or Voter ID).\n"
            "3. Past prescription sheets, laboratory reports, discharge summaries, and ongoing medication bottles.\n"
            "4. Attendant contact details for emergency reference."
        ),
        metadata={"documents": ["Token slip / SMS", "Aadhaar / Ayushman Card", "Past Prescriptions"]},
    ),
    RAGDocument(
        id="DOC-EMERGENCY-007",
        title="24x7 Emergency Helplines & Ambulance Dispatch",
        category="EMERGENCY_HOTLINE",
        content=(
            "Emergency Ambulance & Hospital Hotline Contacts:\n"
            "• National Emergency Ambulance: 108 (Toll-Free, 24x7).\n"
            "• Government Medical Helpline: 102 (Toll-Free, 24x7).\n"
            "• Civil Hospital Ward A Emergency Desk: 011-2399-4400.\n"
            "• For acute chest pain, severe breathlessness, stroke symptoms, or severe accidents, proceed directly to Emergency Room 101."
        ),
        metadata={"hotlines": ["108", "102", "011-2399-4400"]},
    ),
    RAGDocument(
        id="DOC-SAFETY-008",
        title="Clinical Safety Boundary & Prescription Refusal Policy",
        category="CLINICAL_SAFETY",
        content=(
            "Mandatory Clinical Safety Boundary:\n"
            "The AI Assistant has certified limits and CANNOT diagnose medical diseases or prescribe medications, tablets, antibiotics, painkillers, or dosages.\n"
            "If asked for medication prescriptions (e.g., Paracetamol, antibiotics, painkillers, dosages) or medical diagnoses:\n"
            "The assistant MUST explicitly decline and direct the patient to consult the on-duty doctor or triage nurse directly."
        ),
        metadata={"safety_boundary": True},
    ),
]


DEPARTMENT_ROOMS_MAP = {
    "EMERGENCY": {
        "en": "Rooms 101 & 102 (Ground Floor, 24x7)",
        "hi": "कक्ष 101 एवं 102 (भूतल, 24x7)",
        "te": "రూమ్ 101 & 102 (గ్రౌండ్ ఫ్లోర్, 24x7)",
    },
    "GEN_MED": {
        "en": "Rooms 104 & 105 (First Floor)",
        "hi": "कक्ष 104 एवं 105 (प्रथम तल)",
        "te": "రూమ్ 104 & 105 (మొదటి అంతస్తు)",
    },
    "GENERAL MEDICINE": {
        "en": "Rooms 104 & 105 (First Floor)",
        "hi": "कक्ष 104 एवं 105 (प्रथम तल)",
        "te": "రూమ్ 104 & 105 (మొదటి అంతస్తు)",
    },
    "PEDIATRICS": {
        "en": "Room 115 (Second Floor)",
        "hi": "कक्ष 115 (द्वितीय तल)",
        "te": "రూమ్ 115 (రెండవ అంతస్తు)",
    },
    "CARDIOLOGY": {
        "en": "Room 108 (First Floor)",
        "hi": "कक्ष 108 (प्रथम तल)",
        "te": "రూమ్ 108 (మొదటి అంతస్తు)",
    },
    "ORTHOPEDICS": {
        "en": "Room 112 (Second Floor)",
        "hi": "कक्ष 112 (द्वितीय तल)",
        "te": "రూమ్ 112 (రెండవ అంతస్తు)",
    },
}


def get_department_room_string(dept_name: str, lang: str = "en") -> str:
    dept_upper = dept_name.upper()
    for code, room_dict in DEPARTMENT_ROOMS_MAP.items():
        if code in dept_upper:
            return room_dict.get(lang, room_dict["en"])
    return "Consultation Room 104"


def build_dynamic_patient_chunks() -> List[RAGDocument]:
    """
    Dynamically generates structured RAG document chunks for every active patient and visit in the system.
    Includes real-time queue position, triage urgency, vital observations, doctor room, and arrival stats.
    """
    all_entries = store.get_queue(status="ALL")
    patient_docs: List[RAGDocument] = []

    for entry in all_entries:
        # Calculate rank among WAITING patients in the same department
        dept_waiting = [e for e in all_entries if e.department_id == entry.department_id and e.status == "WAITING"]
        rank = 1
        for idx, e in enumerate(dept_waiting):
            if e.visit_id == entry.visit_id:
                rank = idx + 1
                break
        if entry.status != "WAITING":
            rank = 0

        patients_ahead = max(0, rank - 1) if rank > 0 else 0
        estimated_wait = max(5, rank * 8) if rank > 0 else 0
        room_str = get_department_room_string(entry.department_name, "en")

        # Format vitals text
        v = entry.vital_observations
        vitals_list = []
        if v.spo2 is not None:
            vitals_list.append(f"SpO2: {v.spo2}%")
        if v.systolic_bp is not None and v.diastolic_bp is not None:
            vitals_list.append(f"Blood Pressure: {v.systolic_bp}/{v.diastolic_bp} mmHg")
        if v.heart_rate is not None:
            vitals_list.append(f"Heart Rate: {v.heart_rate} bpm")
        if v.temperature_f is not None:
            vitals_list.append(f"Temperature: {v.temperature_f}°F")
        if v.respiratory_rate is not None:
            vitals_list.append(f"Respiratory Rate: {v.respiratory_rate}/min")
        if v.blood_glucose_mg_dl is not None:
            vitals_list.append(f"Blood Glucose: {v.blood_glucose_mg_dl} mg/dL")
        if v.gcs is not None:
            vitals_list.append(f"GCS: {v.gcs}/15")
        vitals_text = ", ".join(vitals_list) if vitals_list else "Standard baseline recorded"

        # Build comprehensive document text
        content = (
            f"Official Patient Token Record:\n"
            f"• Token ID / UHID: {entry.uhid}\n"
            f"• Patient Name: {entry.full_name}\n"
            f"• Age: {entry.age} years | Biological Gender: {entry.gender}\n"
            f"• Department Assigned: {entry.department_name}\n"
            f"• Consultation Room: {room_str}\n"
            f"• Triage Urgency Category: {entry.urgency_category} (Urgency Score: {entry.urgency_score}/100)\n"
            f"• Visit Status: {entry.status}\n"
            f"• Live Queue Position: #{rank} of {len(dept_waiting)} waiting in department ({patients_ahead} patients ahead in line)\n"
            f"• Estimated Waiting Time: ~{estimated_wait} minutes\n"
            f"• Registered Chief Complaint: \"{entry.chief_complaint}\"\n"
            f"• Clinical Vital Signs: {vitals_text}\n"
            f"• Triage Rule Evidence: {', '.join(entry.rule_evidence) if entry.rule_evidence else 'Standard baseline evaluation'}\n"
            f"• Calling Protocol: When called, an audible chime sounds in Ward A and status turns to CALLED. Proceed to {room_str}."
        )

        patient_docs.append(
            RAGDocument(
                id=f"PATIENT-DOC-{entry.uhid}",
                title=f"Patient Record: {entry.full_name} ({entry.uhid})",
                category="PATIENT_RECORD",
                content=content,
                metadata={
                    "uhid": entry.uhid,
                    "patient_id": entry.patient_id,
                    "visit_id": entry.visit_id,
                    "full_name": entry.full_name,
                    "age": entry.age,
                    "gender": entry.gender,
                    "department_id": entry.department_id,
                    "department_name": entry.department_name,
                    "urgency_category": entry.urgency_category,
                    "urgency_score": entry.urgency_score,
                    "status": entry.status,
                    "queue_rank": rank,
                    "patients_ahead": patients_ahead,
                    "estimated_wait_minutes": estimated_wait,
                    "room": room_str,
                    "vitals": vitals_text,
                    "chief_complaint": entry.chief_complaint,
                },
            )
        )

    return patient_docs


def build_dynamic_department_snapshots() -> List[RAGDocument]:
    """
    Generates dynamic real-time department queue load & wait time summary documents.
    """
    all_entries = store.get_queue(status="ALL")
    depts = store.get_departments()
    snapshot_docs: List[RAGDocument] = []

    dept_summaries = []
    total_waiting = 0
    total_in_consult = 0

    for d in depts:
        dept_entries = [e for e in all_entries if e.department_id == d.id]
        waiting_list = [e for e in dept_entries if e.status == "WAITING"]
        called_list = [e for e in dept_entries if e.status == "CALLED"]
        in_consult_list = [e for e in dept_entries if e.status == "IN_CONSULTATION"]

        waiting_count = len(waiting_list)
        called_count = len(called_list)
        in_consult_count = len(in_consult_list)

        total_waiting += waiting_count
        total_in_consult += in_consult_count

        est_max_wait = waiting_count * 8 if waiting_count > 0 else 0
        room_str = get_department_room_string(d.name, "en")

        dept_doc_content = (
            f"Real-Time Department Status: {d.name}\n"
            f"• Consultation Room: {room_str}\n"
            f"• Operating Status: Active\n"
            f"• Patients Waiting in Queue: {waiting_count}\n"
            f"• Patients Currently Called / In Consultation: {called_count + in_consult_count}\n"
            f"• Estimated Average Wait Time for New Registrations: ~{est_max_wait} minutes\n"
            f"• Description: {d.description}"
        )

        snapshot_docs.append(
            RAGDocument(
                id=f"DEPT-SNAPSHOT-{d.id}",
                title=f"Live Department Status: {d.name}",
                category="DEPARTMENT_SNAPSHOT",
                content=dept_doc_content,
                metadata={
                    "department_id": d.id,
                    "department_name": d.name,
                    "waiting_count": waiting_count,
                    "in_consultation_count": in_consult_count,
                    "estimated_wait": est_max_wait,
                    "room": room_str,
                },
            )
        )

        dept_summaries.append(f"• {d.name} ({room_str}): {waiting_count} waiting (~{est_max_wait} min wait)")

    # Global Hospital Summary Document
    global_content = (
        f"Civil Hospital Ward A Live Operations Overview:\n"
        f"• Total Patients Waiting: {total_waiting}\n"
        f"• Total Active Consultations: {total_in_consult}\n"
        f"• Department Breakdowns:\n" + "\n".join(dept_summaries)
    )

    snapshot_docs.append(
        RAGDocument(
            id="DOC-HOSPITAL-LIVE-SNAPSHOT",
            title="Hospital Ward A Live Queue & Wait Times Overview",
            category="DEPARTMENT_SNAPSHOT",
            content=global_content,
            metadata={"total_waiting": total_waiting, "total_consulting": total_in_consult},
        )
    )

    return snapshot_docs


class HospitalRAGRetriever:
    """
    Hybrid RAG Vector & Keyword Search Engine for Hospital Operations and Patient Records.
    Computes TF-IDF vector embeddings, n-gram lexical overlap, and exact token/name matching.
    """

    def __init__(self):
        self._stopwords = {
            "a", "an", "the", "and", "or", "in", "on", "at", "to", "for", "with", "is", "are", "was",
            "were", "be", "this", "that", "it", "of", "from", "by", "what", "which", "how", "when",
            "where", "who", "why", "my", "your", "his", "her", "their", "me", "you", "i", "we", "us",
            "hai", "kya", "ko", "ka", "ki", "ke", "mein", "se", "aur", "ya", "undi", "emi", "ela",
            "eppudu", "ekkada", "naa", "mee", "lo", "ki", "ku", "mariyu", "please", "tell", "show"
        }

    def _tokenize(self, text: str) -> List[str]:
        cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
        tokens = [t.strip() for t in cleaned.split() if len(t.strip()) > 1]
        return [t for t in tokens if t not in self._stopwords]

    def _compute_tf(self, tokens: List[str]) -> Dict[str, float]:
        tf: Dict[str, float] = {}
        total = len(tokens)
        if total == 0:
            return tf
        for t in tokens:
            tf[t] = tf.get(t, 0.0) + 1.0
        for t in tf:
            tf[t] = tf[t] / total
        return tf

    def retrieve(
        self,
        query: str,
        uhid: Optional[str] = None,
        top_k: int = 4,
    ) -> List[RetrievedChunk]:
        """
        Retrieves top-K relevant grounded documents (dynamic patient chunks + live department snapshots + static hospital docs).
        Applies exact token boost if query or uhid specifies an assigned token number or patient name.
        """
        # 1. Collect all documents
        dynamic_patient_docs = build_dynamic_patient_chunks()
        dynamic_dept_docs = build_dynamic_department_snapshots()
        all_docs = dynamic_patient_docs + dynamic_dept_docs + STATIC_HOSPITAL_DOCUMENTS

        q_tokens = self._tokenize(query)
        if not q_tokens and not uhid:
            return [
                RetrievedChunk(document=d, similarity_score=0.5, matched_terms=[])
                for d in STATIC_HOSPITAL_DOCUMENTS[:top_k]
            ]

        # Extract explicit token candidates in query
        match_code = re.search(r"\b((?:SS|UHID|TK)-\d{4}-\d+|(?:SS|UHID|TK)-\d+)\b", query, re.IGNORECASE)
        explicit_token = match_code.group(1).upper() if match_code else (uhid.upper() if uhid else None)

        match_num = re.search(r"\b(?:token|uhid|pass|no\.?|number|id|#)\s*[:#-]?\s*(\d{1,6})\b", query, re.IGNORECASE)
        numeric_candidate = match_num.group(1).strip() if match_num else None

        # 2. Compute IDF across corpus
        doc_count = len(all_docs)
        doc_freq: Dict[str, int] = {}
        doc_tfs: List[Dict[str, float]] = []

        for doc in all_docs:
            doc_tokens = self._tokenize(doc.title + " " + doc.content)
            tf = self._compute_tf(doc_tokens)
            doc_tfs.append(tf)
            for term in set(doc_tokens):
                doc_freq[term] = doc_freq.get(term, 0) + 1

        # 3. Score each document
        scored_chunks: List[RetrievedChunk] = []
        q_tf = self._compute_tf(q_tokens)
        q_lower = query.lower()

        for idx, doc in enumerate(all_docs):
            score = 0.0
            matched: List[str] = []

            # Cosine-like TF-IDF similarity
            doc_tf = doc_tfs[idx]
            for term, q_val in q_tf.items():
                if term in doc_tf:
                    idf = math.log((doc_count + 1) / (doc_freq.get(term, 1) + 1)) + 1.0
                    term_score = (q_val * doc_tf[term]) * (idf ** 1.5)
                    score += term_score
                    matched.append(term)

            # Patient Token / UHID / Name matching boost
            doc_uhid = str(doc.metadata.get("uhid", "")).upper()
            doc_name = str(doc.metadata.get("full_name", "")).lower()

            if explicit_token:
                if doc_uhid == explicit_token or explicit_token in doc.id:
                    score += 10.0
                    matched.append(f"EXACT_TOKEN_MATCH:{explicit_token}")
                elif explicit_token in doc_uhid:
                    score += 6.0
                    matched.append(f"PARTIAL_TOKEN_MATCH:{explicit_token}")

            if numeric_candidate and numeric_candidate.isdigit():
                suffix_padded = f"-{int(numeric_candidate):04d}"
                suffix_raw = f"-{numeric_candidate}"
                if doc_uhid.endswith(suffix_padded) or doc_uhid.endswith(suffix_raw):
                    score += 9.0
                    matched.append(f"NUMERIC_TOKEN_MATCH:{numeric_candidate}")

            # Check if patient name in query
            if doc.category == "PATIENT_RECORD" and doc_name:
                name_parts = [p for p in doc_name.split() if len(p) > 2]
                if any(p in q_lower for p in name_parts):
                    score += 8.0
                    matched.append(f"PATIENT_NAME_MATCH:{doc_name}")

            # Clinical Safety check
            if doc.category == "CLINICAL_SAFETY" and any(k in q_lower for k in ["medicine", "tablet", "pill", "syrup", "dosage", "prescribe", "dawa", "goli", "మందు", "cure", "antibiotic", "paracetamol", "painkiller"]):
                score += 8.0
                matched.append("SAFETY_KEYWORD_MATCH")

            # Department Queue and Snapshot check
            if doc.category == "DEPARTMENT_SNAPSHOT":
                dept_name = str(doc.metadata.get("department_name", "")).lower()
                if any(k in q_lower for k in ["how many", "waiting", "queue", "busiest", "bhed", "line", "kitta", "rush", "load", "average wait", "how long", "kitna time"]):
                    score += 3.5
                    matched.append("QUEUE_LOAD_MATCH")
                if dept_name and (dept_name in q_lower or any(p in q_lower for p in dept_name.split() if len(p) > 3)):
                    score += 5.0
                    matched.append(f"DEPT_LOAD_MATCH:{dept_name}")

            # Emergency hotline check
            if doc.category == "EMERGENCY_HOTLINE" and any(k in q_lower for k in ["ambulance", "emergency", "108", "102", "contact", "phone", "help", "నంబర్", "ఫోన్", "అంబులెన్స్", "फोन"]):
                score += 6.0
                matched.append("HOTLINE_KEYWORD_MATCH")

            # Department / Room Directory check
            if doc.category == "DEPARTMENT_DIRECTORY" and any(k in q_lower for k in ["room", "department", "where", "floor", "kamra", "kahan", "గది", "విభాగం", "ఎక్కడ", "direction", "location"]):
                score += 5.0
                matched.append("ROOM_DIRECTORY_MATCH")

            # Triage priority check
            if doc.category == "TRIAGE_PROTOCOL" and any(k in q_lower for k in ["priority", "priorit", "triage", "score", "critical", "called first", "order", "urgent", "before me", "pahle", "ముందు", "प्राथमिकता"]):
                score += 6.0
                matched.append("TRIAGE_PROTOCOL_MATCH")

            # Vitals check
            if doc.category == "VITALS_REFERENCE" and any(k in q_lower for k in ["vital", "spo2", "oxygen", "pulse", "bp", "blood pressure", "temp", "fever", "heart rate", "रक्तचाप", "ఆక్సిజన్", "pulse"]):
                score += 5.0
                matched.append("VITALS_REFERENCE_MATCH")

            # Documents / Checklist check
            if doc.category == "VISIT_CHECKLIST" and any(k in q_lower for k in ["document", "bring", "carry", "aadhaar", "card", "kagaz", "తీసుకురావాలి", "పత్రాలు", "दस्तावेज", "slip"]):
                score += 5.0
                matched.append("CHECKLIST_MATCH")

            scored_chunks.append(RetrievedChunk(document=doc, similarity_score=score, matched_terms=matched))

        # 4. Sort by highest relevance score
        scored_chunks.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_chunks[:top_k]


# Singleton instance
rag_retriever = HospitalRAGRetriever()
