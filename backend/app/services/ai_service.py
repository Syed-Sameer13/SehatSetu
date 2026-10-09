import os
import re
import httpx
from typing import Optional, List, Dict, Any
from app.core.config import settings
from app.schemas.ai import (
    AISummarizeResponse,
    PatientAssistantRequest,
    PatientAssistantResponse,
)
from app.services.storage import store


SYSTEM_SAFETY_PROMPT = """
You are an extractive clinical text assistant for the SehatSetu hospital queue platform.
Your ONLY role is to summarize the patient's chief complaint into 2-3 concise bullet points:
- Onset and reported duration of primary symptoms
- Anatomical location and character (sharp, dull, throbbing, radiating, burning)
- Reported aggravating or associated factors (fever, nausea, exertion)

STRICT SAFETY CONSTRAINTS:
1. Do NOT suggest any disease diagnosis or differential diagnosis.
2. Do NOT recommend any medication, dosage, or medical intervention.
3. Do NOT evaluate or alter the triage urgency score.
4. If the input text is brief or ambiguous, simply extract the stated terms without speculation.
"""


PATIENT_ASSISTANT_GROUNDING_PROMPT = """
You are the official Patient Information Assistant for SehatSetu Hospital Platform (Civil Hospital, Ward A).
Your ONLY purpose is to answer simple patient doubts accurately, politely, and strictly grounded in the official hospital knowledge provided below.

=======================================================
OFFICIAL GROUNDED KNOWLEDGE BASE:
=======================================================
1. Facility & Operating Hours:
   - Location: Civil Hospital, Ward A.
   - Operating Hours: Emergency Services are open 24x7. Outpatient Department (OPD) is open 8:00 AM - 4:00 PM.
   - Emergency Ambulance Contacts: 108 or 102.
   - Hospital Emergency Desk Phone: 011-2399-4400.

2. Hospital Departments & Locations:
   - Emergency (ER): Red-flag life-threatening conditions (severe hypoxia, acute chest pain, stroke alerts, severe trauma). Rooms 101 & 102 (Ground Floor).
   - General Medicine: Fever, common infections, routine health evaluations, hypertension follow-ups. Rooms 104 & 105 (First Floor).
   - Cardiology: Heart palpitations, ECG assessments, blood pressure monitoring, chest discomfort evaluations. Room 108 (First Floor).
   - Orthopedics: Bone fractures, joint pain, sprains, musculoskeletal injuries. Room 112 (Second Floor).
   - Pediatrics: Child health, infant fever, vaccinations, pediatric care. Room 115 (Second Floor).

3. Token & Queue System:
   - Tokens (e.g., SS-2026-0001, UHID-2026-0089) are generated at the Registration / Intake Desk.
   - Queue rank is dynamically sorted by deterministic clinical triage urgency, followed by verified arrival time.
   - Urgency Categories:
     * CRITICAL: Immediate evaluation indicated.
     * HIGH: Urgent care indicated (~10-15 min estimated wait).
     * MODERATE: Standard care indicated (~25-40 min estimated wait).
     * LOW: Routine outpatient evaluation (~45-60 min estimated wait).
     * NEEDS_REVIEW: Incomplete vitals or pending clinician review.
   - Consultation Call: When your token is called, an audible chime rings and an SMS notification is sent to your registered mobile phone.

4. Baseline Vital Sign Reference (For Educational Reference Only):
   - Oxygen Saturation (SpO2): Normal is 95% - 100%. Values below 92% trigger urgent clinician review.
   - Pulse / Heart Rate: Normal resting rate is 60 - 100 beats per minute (bpm).
   - Blood Pressure (BP): Normal baseline is ~120/80 mmHg.
   - Body Temperature: Normal baseline is 97.8°F - 99.1°F. Fever is typically > 100.4°F.

5. Patient Visit Checklist:
   - Keep your printed token slip or SMS notification ready.
   - Bring any past prescription sheets, lab reports, and Government ID (Aadhaar / Ayushman Bharat card).
   - Proceed immediately to the designated consultation room when your token status shows CALLED.

=======================================================
STRICT SAFETY & GROUNDING BOUNDARIES (MANDATORY):
=======================================================
1. GROUNDING MANDATE: Answer strictly and solely using the knowledge base above or the patient's provided queue/token context. Do not invent any hospital rules, timings, or facts.
2. NO DIAGNOSIS OR PRESCRIPTIONS: NEVER diagnose medical conditions. NEVER prescribe medicines, antibiotics, painkillers, or dosages.
3. UNKNOWN / OUT-OF-BOUNDS RULE: If a question is about medical diagnosis, medication prescriptions, or anything NOT in this knowledge base:
   - You MUST explicitly decline to answer medical questions and instruct the patient: "I do not have certified clinical authority to diagnose conditions or prescribe medications. Please consult the on-duty doctor, triage nurse, or registration desk staff directly."
4. LANGUAGE REQUIREMENT:
   - If the patient asked in Hindi or language="hi", respond in clear, polite Hindi.
   - If the patient asked in Telugu or language="te", respond in clear, polite Telugu.
   - Otherwise, respond in clear, polite English.
"""


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


def _get_department_room(dept_name: str, lang: str = "en") -> str:
    """Helper to return the exact room assigned to a department."""
    dept_upper = dept_name.upper()
    for code, room_dict in DEPARTMENT_ROOMS_MAP.items():
        if code in dept_upper:
            return room_dict.get(lang, room_dict["en"])
    return "Consultation Room 1" if lang == "en" else "परामर्श कक्ष 1" if lang == "hi" else "కన్సల్టేషన్ రూమ్ 1"


def _extract_token_candidate(query: str, uhid: Optional[str] = None) -> Optional[str]:
    """Extract candidate token ID from explicit parameter or query string."""
    if uhid and uhid.strip():
        return uhid.strip().upper()

    # Match patterns like SS-2026-0001, UHID-2026-0089, TK-101
    match_code = re.search(r"\b((?:SS|UHID|TK)-\d{4}-\d+|(?:SS|UHID|TK)-\d+)\b", query, re.IGNORECASE)
    if match_code:
        return match_code.group(1).upper()

    # Match patterns like "Token 1", "Token #2", "Token-0003", "Token: SS-2026-0001"
    match_token = re.search(r"\b(?:token|uhid|pass)\s*(?:no\.?|number|id|#)?\s*[:#-]?\s*([A-Za-z0-9-]+)\b", query, re.IGNORECASE)
    if match_token:
        candidate = match_token.group(1).strip().upper()
        if candidate.lower() not in ["status", "time", "wait", "details", "info", "room", "number", "kahan", "kab", "list", "hai", "kya", "me", "undi"]:
            return candidate

    return None


def _lookup_patient_token(candidate: str) -> Optional[Dict[str, Any]]:
    """
    Looks up a patient visit record in the queue store by UHID, patient ID, visit ID, or numeric token suffix.
    """
    all_entries = store.get_queue(status="ALL")
    candidate_clean = candidate.strip().upper()

    matched_entry = None
    for entry in all_entries:
        entry_uhid = entry.uhid.upper()
        # 1. Exact match
        if entry_uhid == candidate_clean or entry.patient_id.upper() == candidate_clean or entry.visit_id.upper() == candidate_clean:
            matched_entry = entry
            break
        # 2. Match numeric suffix (e.g. candidate="1" matches "SS-2026-0001" or "UHID-2026-0001")
        if candidate_clean.isdigit():
            suffix_4 = f"-{int(candidate_clean):04d}"
            suffix_raw = f"-{candidate_clean}"
            if entry_uhid.endswith(suffix_4) or entry_uhid.endswith(suffix_raw):
                matched_entry = entry
                break
        # 3. Substring matching
        if candidate_clean in entry_uhid:
            matched_entry = entry
            break

    if not matched_entry:
        return None

    # Calculate queue position among active WAITING visits in the same department
    dept_waiting = [e for e in all_entries if e.department_id == matched_entry.department_id and e.status == "WAITING"]
    rank = 1
    for idx, e in enumerate(dept_waiting):
        if e.visit_id == matched_entry.visit_id:
            rank = idx + 1
            break
    if matched_entry.status != "WAITING":
        rank = 0

    return {
        "entry": matched_entry,
        "rank": rank,
        "total_waiting": len(dept_waiting),
    }


def _format_patient_token_details(
    token_data: Dict[str, Any],
    lang: str = "en",
) -> PatientAssistantResponse:
    """Formats full verified patient token details into a multilingual, grounded response."""
    entry = token_data["entry"]
    rank = token_data["rank"]
    total_waiting = token_data["total_waiting"]
    patients_ahead = max(0, rank - 1) if rank > 0 else 0
    estimated_wait = max(5, rank * 8) if rank > 0 else 0
    room_str = _get_department_room(entry.department_name, lang)

    # Vitals summary
    v = entry.vital_observations
    vitals_parts = []
    if v.spo2 is not None:
        vitals_parts.append(f"SpO2: {v.spo2}%")
    if v.systolic_bp is not None and v.diastolic_bp is not None:
        vitals_parts.append(f"BP: {v.systolic_bp}/{v.diastolic_bp} mmHg")
    if v.heart_rate is not None:
        vitals_parts.append(f"Pulse: {v.heart_rate} bpm")
    if v.temperature_f is not None:
        vitals_parts.append(f"Temp: {v.temperature_f}°F")
    vitals_text = ", ".join(vitals_parts) if vitals_parts else "Standard baseline recorded"

    # Status labels & Urgency labels
    if lang == "hi":
        urgency_map = {"CRITICAL": "अति गंभीर (तत्काल)", "HIGH": "गंभीर (शीघ्र)", "MODERATE": "मध्यम (सामान्य)", "LOW": "सामान्य (नियमित)", "NEEDS_REVIEW": "समीक्षा आवश्यक"}
        status_map = {"WAITING": "⏳ कतार में प्रतीक्षारत", "CALLED": "🔔 बुलावा हो चुका (कृपया कक्ष में जाएं)", "IN_CONSULTATION": "👨‍⚕️ परामर्श में", "COMPLETED": "✅ पूर्ण", "CANCELLED": "❌ रद्द"}
        gender_hi = "पुरुष" if entry.gender == "MALE" else "महिला" if entry.gender == "FEMALE" else "अन्य"
        
        status_display = status_map.get(entry.status, entry.status)
        urgency_display = urgency_map.get(entry.urgency_category, entry.urgency_category)
        
        if entry.status == "CALLED":
            queue_info = f"🔔 आपका नंबर आ चुका है! कृपया सीधे {room_str} में प्रवेश करें।"
        elif entry.status == "IN_CONSULTATION":
            queue_info = f"👨‍⚕️ वर्तमान में डॉक्टर के साथ परामर्श चल रहा है।"
        elif entry.status == "COMPLETED":
            queue_info = f"✅ आपका परामर्श सफलतापूर्वक पूरा हो चुका है।"
        else:
            queue_info = f"• कतार स्थिति: विभाग के कुल {total_waiting} में से #{rank} (आगे {patients_ahead} रोगी)\n• अनुमानित प्रतीक्षा समय: ~{estimated_wait} मिनट"

        ans = (
            f"📋 रोगी टोकन विवरण (टोकन ID: {entry.uhid}):\n"
            f"• रोगी का नाम: {entry.full_name} ({entry.age} वर्ष, {gender_hi})\n"
            f"• विभाग: {entry.department_name}\n"
            f"• निर्धारित कक्ष: {room_str}\n"
            f"• ट्राइएज प्राथमिकता: {urgency_display} (स्कोर: {entry.urgency_score}/100)\n"
            f"• वर्तमान स्थिति: {status_display}\n"
            f"{queue_info}\n"
            f"• दर्ज महत्वपूर्ण संकेत: {vitals_text}\n\n"
            f"📢 अगला कदम: कृपया वार्ड ए के प्रतीक्षालय में रहें। बुलावा होने पर अस्पताल में घंटी बजेगी और आपके मोबाइल पर एसएमएस आएगा।"
        )
    elif lang == "te":
        urgency_map = {"CRITICAL": "అత్యవసరం (తక్షణ)", "HIGH": "తీవ్రమైనది (త్వరగా)", "MODERATE": "మధ్యస్థం (సాధారణ)", "LOW": "సాధారణం (రొటీన్)", "NEEDS_REVIEW": "సమీక్ష అవసరం"}
        status_map = {"WAITING": "⏳ క్యూలో వేచి ఉన్నారు", "CALLED": "🔔 పిలవబడింది (దయచేసి గదిలోకి వెళ్ళండి)", "IN_CONSULTATION": "👨‍⚕️ కన్సల్టేషన్‌లో ఉన్నారు", "COMPLETED": "✅ పూర్తయింది", "CANCELLED": "❌ రద్దు చేయబడింది"}
        gender_te = "పురుషుడు" if entry.gender == "MALE" else "స్త్రీ" if entry.gender == "FEMALE" else "ఇతర"

        status_display = status_map.get(entry.status, entry.status)
        urgency_display = urgency_map.get(entry.urgency_category, entry.urgency_category)

        if entry.status == "CALLED":
            queue_info = f"🔔 మీ టోకెన్ పిలవబడింది! దయచేసి వెంటనే {room_str} వద్దకు వెళ్లండి."
        elif entry.status == "IN_CONSULTATION":
            queue_info = f"👨‍⚕️ ప్రస్తుతం డాక్టర్‌తో సంప్రదింపులు జరుగుతున్నాయి."
        elif entry.status == "COMPLETED":
            queue_info = f"✅ మీ కన్సల్టేషన్ పూర్తయింది."
        else:
            queue_info = f"• క్యూ స్థానం: విభాగంలోని {total_waiting} మందిలో #{rank} (ముందు {patients_ahead} రోగులు)\n• సుమారు నిరీక్షణ సమయం: ~{estimated_wait} నిమిషాలు"

        ans = (
            f"📋 రోగి టోకెన్ వివరాలు (టోకెన్ ID: {entry.uhid}):\n"
            f"• రోగి పేరు: {entry.full_name} ({entry.age} సం., {gender_te})\n"
            f"• విభాగం: {entry.department_name}\n"
            f"• కేటాయించిన గది: {room_str}\n"
            f"• ట్రయాజ్ ప్రాధాన్యత: {urgency_display} (స్కోరు: {entry.urgency_score}/100)\n"
            f"• ప్రస్తుత స్థితి: {status_display}\n"
            f"{queue_info}\n"
            f"• ముఖ్య సూచికలు: {vitals_text}\n\n"
            f"📢 తదుపరి చర్య: దయచేసి వార్డ్ A వెయిటింగ్ ఏరియాలో ఉండండి. మీ టోకెన్ పిలిచినప్పుడు గంట మోగుతుంది మరియు మొబైల్‌కు SMS వస్తుంది."
        )
    else:
        status_display = entry.status
        if entry.status == "CALLED":
            queue_info = f"🔔 YOUR TURN HAS BEEN CALLED! Please proceed immediately to {room_str}."
        elif entry.status == "IN_CONSULTATION":
            queue_info = f"👨‍⚕️ Currently in consultation with the duty physician."
        elif entry.status == "COMPLETED":
            queue_info = f"✅ Patient consultation has been completed."
        else:
            queue_info = f"• Live Queue Rank: #{rank} of {total_waiting} in department ({patients_ahead} patients ahead)\n• Estimated Wait Duration: ~{estimated_wait} minutes"

        ans = (
            f"📋 Patient Token Details (Token ID: {entry.uhid}):\n"
            f"• Patient Name: {entry.full_name} ({entry.age}y, {entry.gender})\n"
            f"• Target Department: {entry.department_name}\n"
            f"• Consultation Room: {room_str}\n"
            f"• Triage Priority: {entry.urgency_category} (Urgency Score: {entry.urgency_score}/100)\n"
            f"• Current Status: {status_display}\n"
            f"{queue_info}\n"
            f"• Recorded Vitals: {vitals_text}\n\n"
            f"📢 Next Steps: Please wait in the Ward A seating lounge. An audio chime will ring and an SMS alert will be sent when your token is called."
        )

    return PatientAssistantResponse(
        answer=ans,
        is_ai_generated=False,
        model="deterministic-token-lookup",
        grounded_sources=["Hospital Live Database", f"Token Record {entry.uhid}", "Ward A Queue Protocols"],
        needs_staff_consultation=False,
        suggested_action=f"Proceed to {room_str}" if entry.status == "CALLED" else "Track Live Pass",
    )


def _extractive_rule_fallback(text: str) -> str:
    """Deterministic, extractive fallback formatter if LLM API is offline."""
    clean = text.strip()
    sentences = [s.strip() for s in re.split(r"[.!?\n]+", clean) if s.strip()]

    bullets = []
    if sentences:
        bullets.append(f"• Primary Complaint: {sentences[0]}")
    if len(sentences) > 1:
        bullets.append(f"• Associated Features: {sentences[1]}")
    if len(sentences) > 2:
        bullets.append(f"• Reported Context: {'. '.join(sentences[2:])}")
    if not bullets:
        bullets.append(f"• Stated Symptoms: {clean}")

    bullets.append("• Clinical Notice: Extractive summary for doctor review; no autonomous diagnosis.")
    return "\n".join(bullets)


def _patient_assistant_rule_fallback(
    query: str,
    lang: str = "en",
    uhid: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
) -> PatientAssistantResponse:
    """
    Deterministic knowledge matcher grounded strictly in official hospital facts and patient token database.
    Used when Gemini API is unconfigured, unreachable, or as an instant deterministic safety baseline.
    """
    q = query.lower()

    # 1. Medical advice / Prescription / Diagnosis questions -> STRICT REFUSAL
    medical_keywords = ["medicine", "tablet", "pill", "syrup", "dosage", "prescribe", "cure", "disease", "diagnos", "antibiotic", "paracetamol", "painkiller", "dawa", "ilaj", "goli", "మందు", "చికిత్స"]
    if any(k in q for k in medical_keywords):
        if lang == "hi":
            ans = "मैं चिकित्सीय निदान या दवाइयां निर्धारित नहीं कर सकता। कृपया चिकित्सीय सलाह और उपचार के लिए तुरंत उपस्थित डॉक्टर या ट्राइएज नर्स से परामर्श लें।"
        elif lang == "te":
            ans = "నేను వైద్య నిర్ధారణ చేయలేను లేదా మందులను సూచించలేను. దయచేసి వైద్య సలహా మరియు చికిత్స కోసం వెంటనే ఆసుపత్రిలోని డాక్టర్ లేదా నర్స్‌ను సంప్రదించండి."
        else:
            ans = "I do not have certified clinical authority to diagnose medical conditions or prescribe medications. Please consult the on-duty doctor or triage nurse directly for medical treatment."

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Clinical Safety Boundary Policy"],
            needs_staff_consultation=True,
            suggested_action="Consult On-Duty Doctor / Triage Nurse",
        )

    # 2. Token / Patient ID Lookup (Exact Token Queries & Status Lookups)
    token_candidate = _extract_token_candidate(query, uhid)
    if token_candidate:
        token_data = _lookup_patient_token(token_candidate)
        if token_data:
            return _format_patient_token_details(token_data, lang)
        # If explicitly searched an unknown token (e.g. SS-2026-9999 or Token 99)
        elif any(k in q for k in ["token", "uhid", "ss-2026", "pass", "ట్రాక్", "టోకెన్", "टोकन"]):
            if lang == "hi":
                not_found_ans = f"⚠️ टोकन '{token_candidate}' अस्पताल के सक्रिय पंजीकरण रिकॉर्ड में नहीं मिला। कृपया अपने मुद्रित पर्चे की जांच करें या वार्ड ए में पंजीकरण डेस्क पर संपर्क करें।"
            elif lang == "te":
                not_found_ans = f"⚠️ టోకెన్ '{token_candidate}' ఆసుపత్రి రిజిస్ట్రేషన్ రికార్డులలో కనుగొనబడలేదు. దయచేసి మీ రిజిస్ట్రేషన్ స్లిప్‌ను తనిఖీ చేయండి లేదా వార్డ్ A రిజిస్ట్రేషన్ డెస్క్‌ను సంప్రదించండి."
            else:
                not_found_ans = f"⚠️ Token '{token_candidate}' was not found in active hospital records. Please verify the token number printed on your registration slip, or visit the Registration Desk in Ward A."

            return PatientAssistantResponse(
                answer=not_found_ans,
                is_ai_generated=False,
                model="deterministic-token-lookup",
                grounded_sources=["Hospital Registration Database"],
                needs_staff_consultation=True,
                suggested_action="Visit Registration Desk in Ward A",
            )

    # 3. Queue / Wait Time / Token general query (fallback to context or default token)
    if any(k in q for k in ["token", "queue", "wait", "rank", "position", "turn", "katar", "kab", "line", "సమయం", "టోకెన్", "క్యూ", "ట్రాక్", "टोकन", "कतार", "प्रतीक्षा", "नंबर", "कब"]):
        token_str = uhid or (context.get("uhid") if context else "UHID-2026-0089")
        pos_str = context.get("queue_position", 1) if context else 1
        wait_str = context.get("estimated_wait_minutes", 15) if context else 15
        dept_str = context.get("department_name", "General Medicine") if context else "General Medicine"
        status_str = context.get("status", "WAITING") if context else "WAITING"
        room_str = _get_department_room(dept_str, lang)

        if status_str == "CALLED":
            if lang == "hi":
                ans = f"🔔 आपका टोकन {token_str} बुलाया जा चुका है! कृपया तुरंत {dept_str} ({room_str}) में उपस्थित हों।"
            elif lang == "te":
                ans = f"🔔 మీ టోకెన్ {token_str} పిలవబడింది! దయచేసి వెంటనే {dept_str} ({room_str}) వద్దకు వెళ్లండి."
            else:
                ans = f"🔔 Your token {token_str} has been CALLED! Please proceed immediately to {dept_str} ({room_str})."
        else:
            if lang == "hi":
                ans = f"रोगी टोकन विवरण:\n• आवंटित टोकन: {token_str}\n• लक्षित विभाग: {dept_str}\n• निर्धारित कक्ष: {room_str}\n• सक्रिय कतार स्थिति: #{pos_str}\n• अनुमानित प्रतीक्षा समय: ~{wait_str} मिनट\n(आपका नंबर आने पर अस्पताल में घंटी बजेगी और आपके मोबाइल पर एसएमएस भेजा जाएगा।)"
            elif lang == "te":
                ans = f"రోగి టోకెన్ సమాచారం:\n• కేటాయించిన టోకెన్: {token_str}\n• విభాగం: {dept_str}\n• కేటాయించిన గది: {room_str}\n• క్యూ స్థానం: #{pos_str}\n• సుమారు నిరీక్షణ సమయం: ~{wait_str} నిమిషాలు\n(మీ టోకెన్ పిలిచినప్పుడు గంట మోగుతుంది మరియు మొబైల్‌కు SMS వస్తుంది.)"
            else:
                ans = f"Patient Live Queue Status:\n• Assigned Token: {token_str}\n• Target Department: {dept_str}\n• Consultation Room: {room_str}\n• Current Queue Rank: #{pos_str}\n• Estimated Wait Duration: ~{wait_str} mins\n(When called, a chime will sound and an SMS alert will be dispatched to your phone.)"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Live Queue Engine", "Token Protocol", "Civil Hospital Ward A"],
            needs_staff_consultation=False,
            suggested_action="Track Live Pass on Patient Portal",
        )

    # 4. Triage Prioritization & "Why is someone called before me?"
    if any(k in q for k in ["priority", "priorit", "triage", "score", "rule", "critical", "called first", "first", "order", "urgent", "प्राथमिकता", "ट्राइएज", "ప్రాధాన్యత", "ముందు"]):
        if lang == "hi":
            ans = "सेहत सेतु में कतार का क्रम ट्राइएज गंभीरता (Triage Urgency) और आगमन समय पर आधारित होता है:\n1. अति गंभीर (CRITICAL): ऑक्सीजन < 92% या सीने में तेज दर्द वाले रोगियों को तत्काल देखा जाता है।\n2. गंभीर (HIGH): तेज बुखार या तीव्र हृदय गति (~10-15 मिनट)।\n3. मध्यम (MODERATE): सामान्य दर्द या संक्रमण (~25-40 मिनट)।\n4. सामान्य (LOW): हल्की तकलीफें (~45-60 मिनट)।"
        elif lang == "te":
            ans = "సేహత్‌సేతులో క్యూ క్రమం ట్రయాజ్ అత్యవసరత మరియు వచ్చిన సమయం ఆధారంగా నిర్ణయించబడుతుంది:\n1. అత్యవసరం (CRITICAL): ఆక్సిజన్ < 92% లేదా గుండె నొప్పి ఉన్న రోగులకు తక్షణ ప్రాధాన్యత.\n2. తీవ్రమైనది (HIGH): తీవ్ర జ్వరం లేదా గుండె వేగం (~10-15 నిమిషాలు).\n3. మధ్యస్థం (MODERATE): సాధారణ ఇన్ఫెక్షన్లు (~25-40 నిమిషాలు).\n4. సాధారణం (LOW): సాధారణ సమస్యలు (~45-60 నిమిషాలు)."
        else:
            ans = "SehatSetu prioritizes patients dynamically based on clinical triage urgency score and arrival duration:\n1. CRITICAL: Immediate doctor evaluation (e.g. SpO2 < 92%, acute cardiac distress).\n2. HIGH: Urgent care indicated (~10-15 min wait).\n3. MODERATE: Standard care indicated (~25-40 min wait).\n4. LOW: Routine outpatient evaluation (~45-60 min wait)."

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Deterministic Triage Rules Engine", "Clinical Decision Support"],
            needs_staff_consultation=False,
            suggested_action="Review Triage Rules Policy",
        )

    # 5. Department / Room Number Queries
    if any(k in q for k in ["department", "room", "where", "ward", "cardiology", "orthopedic", "pediatric", "er", "emergency", "general", "kamra", "kahan", "గది", "విభాగం", "ఎక్కడ", "ఎమర్జెన్సీ", "विभाग", "कक्ष", "कहाँ", "कहा", "आपातकालीन", "आपातकाल"]):
        if lang == "hi":
            ans = "सिविल अस्पताल (वार्ड ए) के विभाग एवं कक्ष विवरण:\n• आपातकालीन (ER): कक्ष 101 एवं 102 (24x7 खुला, भूतल)\n• जनरल मेडिसिन (OPD): कक्ष 104 एवं 105 (प्रथम तल)\n• कार्डियोलॉजी (हृदय रोग): कक्ष 108 (प्रथम तल)\n• ऑर्थोपेडिक्स (हड्डी रोग): कक्ष 112 (द्वितीय तल)\n• पीडियाट्रिक्स (बाल रोग): कक्ष 115 (द्वितीय तल)\n(ओपीडी समय: सुबह 8:00 से शाम 4:00 बजे तक)"
        elif lang == "te":
            ans = "సివిల్ హాస్పిటల్ (వార్డ్ A) విభాగాలు & గదుల వివరాలు:\n• ఎమర్జెన్సీ (ER): రూమ్ 101 & 102 (24x7 అందుబాటులో, గ్రౌండ్ ఫ్లోర్)\n• జనరల్ మెడిసిన్ (OPD): రూమ్ 104 & 105 (మొదటి అంతస్తు)\n• కార్డియాలజీ: రూమ్ 108 (మొదటి అంతస్తు)\n• ఆర్థోపెడిక్స్: రూమ్ 112 (రెండవ అంతస్తు)\n• పీడియాట్రిక్స్: రూమ్ 115 (రెండవ అంతస్తు)\n(OPD సమయాలు: ఉదయం 8:00 నుండి సాయంత్రం 4:00 వరకు)"
        else:
            ans = "Civil Hospital (Ward A) Departments & Room Locations:\n• Emergency (ER): Rooms 101 & 102 (Ground Floor, 24x7 Open)\n• General Medicine: Rooms 104 & 105 (First Floor)\n• Cardiology: Room 108 (First Floor)\n• Orthopedics: Room 112 (Second Floor)\n• Pediatrics: Room 115 (Second Floor)\n(OPD Registration Hours: 8:00 AM - 4:00 PM)"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Hospital Facility Directory", "Ward A Map"],
            needs_staff_consultation=False,
            suggested_action="Proceed to designated department room",
        )

    # 6. SMS Notification & Calling System
    if any(k in q for k in ["sms", "message", "notification", "chime", "sound", "bell", "alert", "सूचना", "घंटी", "సందేశం", "గంట"]):
        if lang == "hi":
            ans = "बुलावे एवं सूचना की प्रक्रिया:\n1. जब डॉक्टर आपका नंबर लगाते हैं, तो अस्पताल वार्ड में ऑडियो डिंग-डोंग घंटी बजती है।\n2. आपके पंजीकृत मोबाइल नंबर पर तुरंत एसएमएस भेजा जाता है।\n3. आपके डिजिटल पास पर स्थिति CALLED में बदल जाती है और परामर्श कक्ष का नंबर दिखाई देता है।"
        elif lang == "te":
            ans = "కాల్ & నోటిఫికేషన్ ప్రక్రియ:\n1. డాక్టర్ మీ టోకెన్ పిలిచినప్పుడు, వార్డ్‌లో డింగ్-డాంగ్ గంట మోగుతుంది.\n2. మీ రిజిస్టర్డ్ మొబైల్ నంబర్‌కు తక్షణ SMS పంపబడుతుంది.\n3. మీ డిజిటల్ పాస్‌లో స్టేటస్ CALLED గా మారుతుంది మరియు కన్సల్టేషన్ రూమ్ వివరాలు కనిపిస్తాయి."
        else:
            ans = "Notification & Patient Calling System:\n1. When the duty doctor calls your turn, an audible hospital chime rings in Ward A.\n2. An automated SMS notification is dispatched to your registered mobile number.\n3. Your Live Token Pass status turns to CALLED with the designated Consultation Room."

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["SMS Broadcast System", "Hospital Realtime Engine"],
            needs_staff_consultation=False,
            suggested_action="Keep phone active and watch the display",
        )

    # 7. About SehatSetu / Hospital Intro
    if any(k in q for k in ["sehatsetu", "about", "what is", "hospital", "ward a", "अस्पताल", "सेहत सेतु", "ఆసుపత్రి", "సేహత్‌సేతు"]):
        if lang == "hi":
            ans = "सेहत सेतु (SehatSetu) सिविल अस्पताल • वार्ड ए का स्मार्ट रोगी कतार एवं आपातकालीन ट्राइएज प्लेटफॉर्म है। यह पारदर्शी, नियम-आधारित ट्राइएज और वास्तविक समय में कतार प्रबंधन प्रदान करता है।"
        elif lang == "te":
            ans = "సేహత్‌సేతు (SehatSetu) అనేది సివిల్ హాస్పిటల్ • వార్డ్ A యొక్క స్మార్ట్ పేషెంట్ క్యూ మరియు ఎమర్జెన్సీ ట్రయాజ్ వ్యవస్థ. ఇది రియల్-టైమ్ క్యూ నిర్వహణ మరియు వైద్య సహాయాన్ని అందిస్తుంది."
        else:
            ans = "SehatSetu is the Smart Patient Queue & Emergency Triage Platform deployed at Civil Hospital • Ward A. It provides deterministic, clinician-auditable triage prioritization and live token tracking."

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Hospital Overview", "Ayushman Bharat Digital Health"],
            needs_staff_consultation=False,
            suggested_action="Explore Overview Dashboard",
        )

    # 8. Emergency / Ambulance Contacts
    if any(k in q for k in ["ambulance", "emergency", "contact", "phone", "number", "help", "aapatkal", "ఫోన్", "అంబులెన్స్", "ఆపద"]):
        if lang == "hi":
            ans = "आपातकालीन सेवाएं 24x7 उपलब्ध हैं। आपातकालीन एम्बुलेंस: 108 या 102। सिविल अस्पताल हेल्पडेस्क: 011-2399-4400। आपातकाल की स्थिति में सीधे कक्ष 101 (ER) पर जाएं।"
        elif lang == "te":
            ans = "అత్యవసర సేవలు 24x7 అందుబాటులో ఉన్నాయి. ఎమర్జెన్సీ అంబులెన్స్: 108 లేదా 102. సివిల్ హాస్పిటల్ హెల్ప్‌డెస్క్: 011-2399-4400. అత్యవసర పరిస్థితిలో నేరుగా రూమ్ 101 (ER) వద్దకు వెళ్లండి."
        else:
            ans = "Emergency Services are available 24x7. Emergency Ambulance Hotline: 108 or 102. Civil Hospital Desk: 011-2399-4400. In case of acute symptoms, proceed immediately to Emergency Room 101."

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Emergency Protocol"],
            needs_staff_consultation=False,
            suggested_action="Call 108 / 102 in critical emergency",
        )

    # 9. Normal Vitals Reference
    if any(k in q for k in ["vital", "spo2", "oxygen", "pulse", "heart rate", "bp", "blood pressure", "temp", "fever", "బ్లడ్ ప్రెజర్", "ఆక్సిజన్", "రక్తపోటు", "నాడి", "ऑक्सीजन", "रक्तचाप", "नाड़ी", "बुखार"]):
        if lang == "hi":
            ans = "सामान्य महत्वपूर्ण संकेत (केवल सामान्य जानकारी के लिए):\n• ऑक्सीजन (SpO2): 95% - 100% (92% से कम पर डॉक्टर तुरंत देखते हैं)\n• हृदय गति (Pulse): 60 - 100 bpm\n• रक्तचाप (BP): ~120/80 mmHg\n• तापमान: 97.8°F - 99.1°F (बुखार > 100.4°F)"
        elif lang == "te":
            ans = "ప్రామాణిక ముఖ్య సూచికలు (సాధారణ అవగాహన కోసం మాత్రమే):\n• ఆక్సిజన్ (SpO2): 95% - 100% (92% కంటే తక్కువ ఉంటే తక్షణ పరిశీలన)\n• పల్స్ / గుండె వేగం: 60 - 100 bpm\n• రక్తపోటు (BP): ~120/80 mmHg\n• ఉష్ణోగ్రత: 97.8°F - 99.1°F (జ్వరం > 100.4°F)"
        else:
            ans = "Normal Baseline Vital Ranges (Educational Reference Only):\n• Oxygen Saturation (SpO2): 95% - 100% (Below 92% is prioritized for rapid clinician review)\n• Pulse / Heart Rate: 60 - 100 bpm\n• Blood Pressure: ~120/80 mmHg\n• Body Temperature: 97.8°F - 99.1°F (Fever > 100.4°F)"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Clinical Vital Range Guidelines"],
            needs_staff_consultation=False,
            suggested_action="Consult clinician for personalized readings",
        )

    # 10. Documents / Checklist / What to bring
    if any(k in q for k in ["document", "bring", "carry", "aadhaar", "card", "kagaz", "తీసుకురావాలి", "పత్రాలు", "दस्तावेज", "कागज", "आईडी"]):
        if lang == "hi":
            ans = "अस्पताल में परामर्श के लिए निम्नलिखित साथ रखें:\n1. आपका मुद्रित टोकन पर्चा या मोबाइल एसएमएस\n2. पहचान पत्र (आधार कार्ड / आयुष्मान भारत कार्ड)\n3. पुराने पर्चे, दवाइयां और टेस्ट रिपोर्ट"
        elif lang == "te":
            ans = "వైద్య సంప్రదింపుల కోసం దయచేసి వీటిని సిద్ధంగా ఉంచుకోండి:\n1. మీ ప్రింటెడ్ టోకెన్ స్లిప్ లేదా మొబైల్ SMS\n2. గుర్తింపు కార్డు (ఆధార్ లేదా ఆయుష్మాన్ భారత్ కార్డు)\n3. మునుపటి మెడికల్ రిపోర్టులు మరియు మందుల వివరాలు"
        else:
            ans = "Please keep the following ready for your consultation:\n1. Your printed UHID Token slip or SMS alert\n2. Government ID (Aadhaar or Ayushman Bharat card)\n3. Past medical records, test reports, and current medication list"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Hospital Registration Checklist"],
            needs_staff_consultation=False,
            suggested_action="Keep token and ID ready",
        )

    # 11. Default Unknown / Out-of-Scope Query -> Explicit guidance to consult hospital staff
    if lang == "hi":
        ans = "मेरे पास इस विषय की प्रमाणित अस्पताल जानकारी उपलब्ध नहीं है। कृपया सही जानकारी और मार्गदर्शन के लिए अस्पताल के पंजीकरण डेस्क (Registration Desk) या उपस्थित अस्पताल कर्मचारियों से संपर्क करें।"
    elif lang == "te":
        ans = "నా వద్ద ఈ అంశానికి సంబంధించిన నిర్ధారిత ఆసుపత్రి సమాచారం అందుబాటులో లేదు. సరైన సమాచారం కోసం దయచేసి రిజిస్ట్రేషన్ డెస్క్ లేదా ఆసుపత్రి సిబ్బందిని సంప్రదించండి."
    else:
        ans = "I do not have verified hospital information regarding this query. Please consult the on-duty hospital staff at the Registration Desk or Information Counter in Ward A for assistance."

    return PatientAssistantResponse(
        answer=ans,
        is_ai_generated=False,
        model="deterministic-grounded-rules",
        grounded_sources=["Hospital Scope Boundary"],
        needs_staff_consultation=True,
        suggested_action="Consult Registration Desk / Hospital Staff",
    )


async def summarize_chief_complaint(complaint: str) -> AISummarizeResponse:
    """
    Summarizes raw patient symptoms into structured clinical bullets.
    Uses Google Gemini API if configured, with graceful fallback to deterministic extraction.
    """
    if not complaint or len(complaint.strip()) < 3:
        return AISummarizeResponse(
            summary="• No detailed chief complaint recorded.",
            is_ai_generated=False,
            model="extractive-fallback",
        )

    # Check if Gemini is enabled and configured
    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")
    if settings.ENABLE_AI_SUMMARIZATION and api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.AI_MODEL_NAME}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": f"{SYSTEM_SAFETY_PROMPT}\n\nChief Complaint to summarize:\n\"{complaint}\""}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.0,
                    "maxOutputTokens": 200,
                }
            }

            async with httpx.AsyncClient(timeout=3.5) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if content:
                            return AISummarizeResponse(
                                summary=content.strip(),
                                is_ai_generated=True,
                                model=settings.AI_MODEL_NAME,
                            )
        except Exception as e:
            print(f"[AI Service Warning] Gemini summarization failed, falling back to extractive: {e}")

    # Graceful fallback
    fallback_summary = _extractive_rule_fallback(complaint)
    return AISummarizeResponse(
        summary=fallback_summary,
        is_ai_generated=False,
        model="extractive-fallback",
    )


async def solve_patient_doubt(request: PatientAssistantRequest) -> PatientAssistantResponse:
    """
    Answers patient doubts accurately, grounded strictly in official hospital guidelines and queue data.
    If a specific Token ID is requested or recognized, queries the patient visit database for verified records.
    If knowledge is not available or requests medical diagnosis/prescriptions, explicitly directs to staff.
    """
    query = request.question.strip()
    lang = request.language or "en"
    uhid = request.patient_uhid
    context = request.patient_context or {}

    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    # Check if a specific Token ID is queried
    token_candidate = _extract_token_candidate(query, uhid)
    token_lookup_data = _lookup_patient_token(token_candidate) if token_candidate else None

    # If Gemini is enabled and configured, query Gemini with the strict grounding prompt & verified token context
    if settings.ENABLE_AI_SUMMARIZATION and api_key:
        try:
            context_str = ""
            if token_lookup_data:
                e = token_lookup_data["entry"]
                r = token_lookup_data["rank"]
                tot = token_lookup_data["total_waiting"]
                room = _get_department_room(e.department_name, "en")
                context_str = (
                    f"VERIFIED PATIENT TOKEN RECORD:\n"
                    f"- Token ID: {e.uhid}\n"
                    f"- Name: {e.full_name} ({e.age}y, {e.gender})\n"
                    f"- Department: {e.department_name}\n"
                    f"- Assigned Room: {room}\n"
                    f"- Triage Priority: {e.urgency_category} (Score: {e.urgency_score})\n"
                    f"- Status: {e.status}\n"
                    f"- Queue Position: #{r} of {tot} waiting (Estimated wait: ~{max(5, r * 8)}m)\n"
                )
            elif context:
                context_str = f"Context: Department: {context.get('department_name', 'General')}, Queue Position: #{context.get('queue_position', 1)}, Wait: ~{context.get('estimated_wait_minutes', 15)}m\n"

            prompt_text = (
                f"{PATIENT_ASSISTANT_GROUNDING_PROMPT}\n\n"
                f"CURRENT PATIENT CONTEXT:\n{context_str}\n"
                f"REQUESTED LANGUAGE: {lang}\n"
                f"PATIENT QUESTION:\n\"{query}\"\n\n"
                f"Provide a grounded, concise answer. If asking for their token information, accurately present the verified token details above. If asking medical diagnosis/prescription, explicitly refuse and instruct them to consult the doctor."
            )

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.AI_MODEL_NAME}:generateContent?key={api_key}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": prompt_text}],
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 350,
                },
            }

            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                        if content:
                            lower_c = content.lower()
                            needs_consult = "consult" in lower_c or "doctor" in lower_c or "nurse" in lower_c or "डॉक्टर" in lower_c or "డాక్టర్" in lower_c
                            return PatientAssistantResponse(
                                answer=content.strip(),
                                is_ai_generated=True,
                                model=settings.AI_MODEL_NAME,
                                grounded_sources=["SehatSetu Grounded Knowledge Base", "Civil Hospital Ward A", f"Token {token_candidate}" if token_candidate else "Live Queue"],
                                needs_staff_consultation=needs_consult,
                                suggested_action="Consult Staff" if needs_consult else "Follow Hospital Guidance",
                            )
        except Exception as e:
            print(f"[AI Service Warning] Gemini patient assistant error, falling back to deterministic: {e}")

    # Accurate deterministic grounded fallback
    return _patient_assistant_rule_fallback(query, lang, uhid, context)
