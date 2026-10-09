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
   - Emergency (ER): Red-flag life-threatening conditions (severe hypoxia, acute chest pain, stroke alerts, severe trauma). Rooms 101 & 102.
   - General Medicine: Fever, common infections, routine health evaluations, hypertension follow-ups. Rooms 104 & 105.
   - Cardiology: Heart palpitations, ECG assessments, blood pressure monitoring, chest discomfort evaluations. Room 108.
   - Orthopedics: Bone fractures, joint pain, sprains, musculoskeletal injuries. Room 112.
   - Pediatrics: Child health, infant fever, vaccinations, pediatric care. Room 115.

3. Token & Queue System:
   - Tokens (e.g., UHID-2026-0089) are generated at the Registration / Intake Desk.
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
1. GROUNDING MANDATE: Answer strictly and solely using the knowledge base above or the patient's provided queue context. Do not invent any hospital rules, timings, or facts.
2. NO DIAGNOSIS OR PRESCRIPTIONS: NEVER diagnose medical conditions. NEVER prescribe medicines, antibiotics, painkillers, or dosages.
3. UNKNOWN / OUT-OF-BOUNDS RULE: If a question is about medical diagnosis, medication prescriptions, or anything NOT in this knowledge base:
   - You MUST explicitly decline to answer medical questions and instruct the patient: "I do not have certified clinical authority to diagnose conditions or prescribe medications. Please consult the on-duty doctor, triage nurse, or registration desk staff directly."
4. LANGUAGE REQUIREMENT:
   - If the patient asked in Hindi or language="hi", respond in clear, polite Hindi.
   - If the patient asked in Telugu or language="te", respond in clear, polite Telugu.
   - Otherwise, respond in clear, polite English.
"""


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
    Deterministic knowledge matcher grounded strictly in official hospital facts.
    Used when Gemini API is unconfigured, unreachable, or as an instant deterministic safety baseline.
    """
    q = query.lower()
    sources = ["Civil Hospital Operational Guidelines", "SehatSetu Queue Protocols"]

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

    # 2. Token / Queue / Wait Time Queries
    if any(k in q for k in ["token", "queue", "wait", "rank", "position", "turn", "katar", "kab", "line", "సమయం", "టోకెన్", "క్యూ", "ట్రాక్", "टोकन", "कतार", "प्रतीक्षा", "नंबर", "कब"]):
        token_str = uhid or (context.get("uhid") if context else "UHID-2026-0089")
        pos_str = context.get("queue_position", 1) if context else 1
        wait_str = context.get("estimated_wait_minutes", 15) if context else 15
        dept_str = context.get("department_name", "General Medicine") if context else "General Medicine"
        status_str = context.get("status", "WAITING") if context else "WAITING"

        if status_str == "CALLED":
            if lang == "hi":
                ans = f"🔔 आपका टोकन {token_str} बुलाया जा चुका है! कृपया तुरंत {dept_str} (Consultation Room 1) में उपस्थित हों।"
            elif lang == "te":
                ans = f"🔔 మీ టోకెన్ {token_str} పిలవబడింది! దయచేసి వెంటనే {dept_str} (Consultation Room 1) వద్దకు వెళ్లండి."
            else:
                ans = f"🔔 Your token {token_str} has been CALLED! Please proceed immediately to {dept_str} (Consultation Room 1)."
        else:
            if lang == "hi":
                ans = f"रोगी टोकन विवरण:\n• आवंटित टोकन: {token_str}\n• लक्षित विभाग: {dept_str}\n• सक्रिय कतार स्थिति: #{pos_str}\n• अनुमानित प्रतीक्षा समय: ~{wait_str} मिनट\n(आपका नंबर आने पर अस्पताल में घंटी बजेगी और आपके मोबाइल पर एसएमएस भेजा जाएगा।)"
            elif lang == "te":
                ans = f"రోగి టోకెన్ సమాచారం:\n• కేటాయించిన టోకెన్: {token_str}\n• విభాగం: {dept_str}\n• క్యూ స్థానం: #{pos_str}\n• సుమారు నిరీక్షణ సమయం: ~{wait_str} నిమిషాలు\n(మీ టోకెన్ పిలిచినప్పుడు గంట మోగుతుంది మరియు మొబైల్‌కు SMS వస్తుంది.)"
            else:
                ans = f"Patient Live Queue Status:\n• Assigned Token: {token_str}\n• Target Department: {dept_str}\n• Current Queue Rank: #{pos_str}\n• Estimated Wait Duration: ~{wait_str} mins\n(When called, a chime will sound and an SMS alert will be dispatched to your phone.)"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Live Queue Engine", "Token Protocol", "Civil Hospital Ward A"],
            needs_staff_consultation=False,
            suggested_action="Track Live Pass on Patient Portal",
        )

    # 3. Triage Prioritization & "Why is someone called before me?"
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

    # 4. Department / Room Number Queries
    if any(k in q for k in ["department", "room", "where", "ward", "cardiology", "orthopedic", "pediatric", "er", "emergency", "general", "kamra", "kahan", "గది", "విభాగం", "ఎక్కడ", "ఎమర్జెన్సీ", "विभाग", "कक्ष", "कहाँ", "कहा", "आपातकालीन", "आपातकाल"]):
        if lang == "hi":
            ans = "सिविल अस्पताल (वार्ड ए) के विभाग एवं कक्ष विवरण:\n• आपातकालीन (ER): कक्ष 101 एवं 102 (24x7 खुला)\n• जनरल मेडिसिन (OPD): कक्ष 104 एवं 105\n• कार्डियोलॉजी (हृदय रोग): कक्ष 108\n• ऑर्थोपेडिक्स (हड्डी रोग): कक्ष 112\n• पीडियाट्रिक्स (बाल रोग): कक्ष 115\n(ओपीडी समय: सुबह 8:00 से शाम 4:00 बजे तक)"
        elif lang == "te":
            ans = "సివిల్ హాస్పిటల్ (వార్డ్ A) విభాగాలు & గదుల వివరాలు:\n• ఎమర్జెన్సీ (ER): రూమ్ 101 & 102 (24x7 అందుబాటులో)\n• జనరల్ మెడిసిన్ (OPD): రూమ్ 104 & 105\n• కార్డియాలజీ: రూమ్ 108\n• ఆర్థోపెడిక్స్: రూమ్ 112\n• పీడియాట్రిక్స్ (పిల్లల విభాగం): రూమ్ 115\n(OPD సమయాలు: ఉదయం 8:00 నుండి సాయంత్రం 4:00 వరకు)"
        else:
            ans = "Civil Hospital (Ward A) Departments & Room Locations:\n• Emergency (ER): Rooms 101 & 102 (24x7 Open)\n• General Medicine: Rooms 104 & 105\n• Cardiology: Room 108\n• Orthopedics: Room 112\n• Pediatrics: Room 115\n(OPD Registration Hours: 8:00 AM - 4:00 PM)"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="deterministic-grounded-rules",
            grounded_sources=["Hospital Facility Directory", "Ward A Map"],
            needs_staff_consultation=False,
            suggested_action="Proceed to designated department room",
        )

    # 5. SMS Notification & Calling System
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

    # 6. About SehatSetu / Hospital Intro
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

    # 7. Emergency / Ambulance Contacts
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

    # 8. Normal Vitals Reference
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

    # 9. Documents / Checklist / What to bring
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

    # 10. Default Unknown / Out-of-Scope Query -> Explicit guidance to consult hospital staff
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
    If knowledge is not available or requests medical diagnosis/prescriptions, it explicitly directs to related staff.
    """
    query = request.question.strip()
    lang = request.language or "en"
    uhid = request.patient_uhid
    context = request.patient_context or {}

    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    # If Gemini is enabled and configured, query Gemini with the strict grounding prompt
    if settings.ENABLE_AI_SUMMARIZATION and api_key:
        try:
            context_str = f"Patient UHID: {uhid or 'Not specified'}\n"
            if context:
                context_str += f"Context: Department: {context.get('department_name', 'General')}, Queue Position: #{context.get('queue_position', 1)}, Wait: ~{context.get('estimated_wait_minutes', 15)}m\n"

            prompt_text = (
                f"{PATIENT_ASSISTANT_GROUNDING_PROMPT}\n\n"
                f"CURRENT PATIENT CONTEXT:\n{context_str}\n"
                f"REQUESTED LANGUAGE: {lang}\n"
                f"PATIENT QUESTION:\n\"{query}\"\n\n"
                f"Provide a grounded, concise answer. If out of scope or medical diagnosis/prescription is asked, explicitly refuse and instruct them to consult the doctor or hospital staff."
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
                    "maxOutputTokens": 300,
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
                                grounded_sources=["SehatSetu Grounded Knowledge Base", "Civil Hospital Ward A"],
                                needs_staff_consultation=needs_consult,
                                suggested_action="Consult Staff" if needs_consult else "Follow Hospital Guidance",
                            )
        except Exception as e:
            print(f"[AI Service Warning] Gemini patient assistant error, falling back to deterministic: {e}")

    # Accurate deterministic grounded fallback
    return _patient_assistant_rule_fallback(query, lang, uhid, context)

