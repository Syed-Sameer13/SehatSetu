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
from app.services.rag_engine import (
    rag_retriever,
    get_department_room_string,
    RetrievedChunk,
    RAGDocument,
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


RAG_GROUNDED_PROMPT_TEMPLATE = """
You are the official SehatSetu Hospital Information Assistant for Civil Hospital, Ward A.
Your primary role is to answer patient and staff questions accurately, politely, and strictly grounded in the RETRIEVED REAL-TIME HOSPITAL KNOWLEDGE & PATIENT RECORDS provided below.

=======================================================
RETRIEVED GROUNDED KNOWLEDGE BASE (RAG PIPELINE):
=======================================================
{retrieved_context}
=======================================================

STRICT SAFETY & GROUNDING BOUNDARIES (MANDATORY):
1. GROUNDING MANDATE: Answer accurately using the retrieved knowledge chunks above (including live patient tokens, department queue counts, wait times, and room directories). Do not invent any hospital rules or facts.
2. NO DIAGNOSIS OR PRESCRIPTIONS: NEVER diagnose medical conditions. NEVER prescribe medicines, antibiotics, painkillers, or dosages.
3. UNKNOWN / MEDICAL ADVICE RULE: If a question asks for medical diagnosis, drug prescriptions, or is completely outside the retrieved knowledge base:
   - You MUST explicitly decline to prescribe or diagnose, and advise: "I do not have certified clinical authority to diagnose conditions or prescribe medications. Please consult the on-duty doctor or triage nurse directly."
4. DYNAMIC TOKEN & QUEUE QUESTIONS:
   - If the user asks about a token ID (e.g. SS-2026-0021 or 21), name, or queue rank, state the patient's name, assigned department, doctor room, live queue position, estimated wait time, and triage category clearly.
   - If the user asks why someone was called before them, explain that SehatSetu uses deterministic clinical triage (patients with critical oxygen/vitals or severe emergency symptoms receive immediate physician attention).
   - If the user asks about department waiting times or patient counts, use the live department snapshot figures provided in the retrieved chunks.
5. MULTILINGUAL INSTRUCTIONS:
   - If the requested language is "hi" or query is in Hindi/Hinglish, reply in clear, polite Hindi.
   - If the requested language is "te" or query is in Telugu, reply in clear, polite Telugu.
   - Otherwise, reply in clear, polite English.
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


def _format_patient_rag_response(
    patient_doc: RAGDocument,
    lang: str = "en",
    retrieved_sources: Optional[List[str]] = None,
) -> PatientAssistantResponse:
    """Formats a dynamic patient record into a multilingual, grounded response."""
    meta = patient_doc.metadata
    name = meta.get("full_name", "Patient")
    uhid = meta.get("uhid", "UHID-XXXX")
    dept = meta.get("department_name", "General Department")
    room = get_department_room_string(dept, lang)
    urgency = meta.get("urgency_category", "LOW")
    status = meta.get("status", "WAITING")
    rank = meta.get("queue_rank", 1)
    wait = meta.get("estimated_wait_minutes", 15)
    patients_ahead = meta.get("patients_ahead", max(0, rank - 1) if rank > 0 else 0)
    vitals = meta.get("vitals", "Recorded baseline")

    sources = retrieved_sources or [patient_doc.title, "Ward A Queue Protocols"]

    if lang == "hi":
        urgency_map = {"CRITICAL": "अति गंभीर (तत्काल)", "HIGH": "गंभीर (शीघ्र)", "MODERATE": "मध्यम (सामान्य)", "LOW": "सामान्य (नियमित)", "NEEDS_REVIEW": "समीक्षा आवश्यक"}
        status_map = {"WAITING": "⏳ कतार में प्रतीक्षारत", "CALLED": "🔔 बुलावा हो चुका (कृपया कक्ष में जाएं)", "IN_CONSULTATION": "👨‍⚕️ परामर्श में", "COMPLETED": "✅ पूर्ण", "CANCELLED": "❌ रद्द"}

        status_display = status_map.get(status, status)
        urgency_display = urgency_map.get(urgency, urgency)

        if status == "CALLED":
            queue_info = f"🔔 आपका नंबर आ चुका है! कृपया सीधे {room} में प्रवेश करें।"
        elif status == "IN_CONSULTATION":
            queue_info = f"👨‍⚕️ वर्तमान में डॉक्टर के साथ परामर्श चल रहा है।"
        elif status == "COMPLETED":
            queue_info = f"✅ आपका परामर्श सफलतापूर्वक पूरा हो चुका है।"
        else:
            queue_info = f"• कतार स्थिति: विभाग में #{rank} (आगे {patients_ahead} रोगी)\n• अनुमानित प्रतीक्षा समय: ~{wait} मिनट"

        ans = (
            f"📋 रोगी टोकन विवरण (टोकन ID: {uhid}):\n"
            f"• रोगी का नाम: {name}\n"
            f"• विभाग: {dept}\n"
            f"• निर्धारित कक्ष: {room}\n"
            f"• ट्राइएज प्राथमिकता: {urgency_display}\n"
            f"• वर्तमान स्थिति: {status_display}\n"
            f"• महत्वपूर्ण संकेत (Vitals): {vitals}\n"
            f"{queue_info}\n\n"
            f"📢 अगला कदम: कृपया वार्ड ए के प्रतीक्षालय में रहें। बुलावा होने पर अस्पताल में घंटी बजेगी और एसएमएस आएगा।"
        )
    elif lang == "te":
        urgency_map = {"CRITICAL": "అత్యవసరం (తక్షణ)", "HIGH": "తీవ్రమైనది (త్వరగా)", "MODERATE": "మధ్యస్థం (సాధారణ)", "LOW": "సాధారణం (రొటీన్)", "NEEDS_REVIEW": "సమీక్ష అవసరం"}
        status_map = {"WAITING": "⏳ క్యూలో వేచి ఉన్నారు", "CALLED": "🔔 పిలవబడింది (దయచేసి గదిలోకి వెళ్ళండి)", "IN_CONSULTATION": "👨‍⚕️ కన్సల్టేషన్‌లో ఉన్నారు", "COMPLETED": "✅ పూర్తయింది", "CANCELLED": "❌ రద్దు చేయబడింది"}

        status_display = status_map.get(status, status)
        urgency_display = urgency_map.get(urgency, urgency)

        if status == "CALLED":
            queue_info = f"🔔 మీ టోకెన్ పిలవబడింది! దయచేసి వెంటనే {room} వద్దకు వెళ్లండి."
        elif status == "IN_CONSULTATION":
            queue_info = f"👨‍⚕️ ప్రస్తుతం డాక్టర్‌తో సంప్రదింపులు జరుగుతున్నాయి."
        elif status == "COMPLETED":
            queue_info = f"✅ మీ కన్సల్టేషన్ పూర్తయింది."
        else:
            queue_info = f"• క్యూ స్థానం: విభాగంలో #{rank} (ముందు {patients_ahead} రోగులు)\n• సుమారు నిరీక్షణ సమయం: ~{wait} నిమిషాలు"

        ans = (
            f"📋 రోగి టోకెన్ వివరాలు (టోకెన్ ID: {uhid}):\n"
            f"• రోగి పేరు: {name}\n"
            f"• విభాగం: {dept}\n"
            f"• కేటాయించిన గది: {room}\n"
            f"• ట్రయాజ్ ప్రాధాన్యత: {urgency_display}\n"
            f"• ప్రస్తుత స్థితి: {status_display}\n"
            f"• కీలక సూచికలు (Vitals): {vitals}\n"
            f"{queue_info}\n\n"
            f"📢 తదుపరి చర్య: దయచేసి వార్డ్ A వెయిటింగ్ ఏరియాలో ఉండండి. మీ టోకెన్ పిలిచినప్పుడు గంట మోగుతుంది మరియు SMS వస్తుంది."
        )
    else:
        status_display = status
        if status == "CALLED":
            queue_info = f"🔔 YOUR TURN HAS BEEN CALLED! Please proceed immediately to {room}."
        elif status == "IN_CONSULTATION":
            queue_info = f"👨‍⚕️ Currently in consultation with the duty physician."
        elif status == "COMPLETED":
            queue_info = f"✅ Patient consultation has been completed."
        else:
            queue_info = f"• Live Queue Rank: #{rank} in department ({patients_ahead} patients ahead)\n• Estimated Wait Duration: ~{wait} minutes"

        ans = (
            f"📋 Patient Token Details (Token ID: {uhid}):\n"
            f"• Patient Name: {name}\n"
            f"• Target Department: {dept}\n"
            f"• Consultation Room: {room}\n"
            f"• Triage Priority: {urgency}\n"
            f"• Current Status: {status_display}\n"
            f"• Clinical Vitals: {vitals}\n"
            f"{queue_info}\n\n"
            f"📢 Next Steps: Please wait in the Ward A seating lounge. An audio chime will ring and an SMS alert will be sent when your token is called."
        )

    return PatientAssistantResponse(
        answer=ans,
        is_ai_generated=False,
        model="rag-deterministic-synthesizer",
        grounded_sources=sources,
        needs_staff_consultation=False,
        suggested_action=f"Proceed to {room}" if status == "CALLED" else "Track Live Pass",
    )


def _format_department_snapshot_response(
    dept_chunk: RAGDocument,
    lang: str = "en",
    retrieved_sources: Optional[List[str]] = None,
) -> PatientAssistantResponse:
    """Formats dynamic department queue loads into localized responses."""
    sources = retrieved_sources or [dept_chunk.title]
    meta = dept_chunk.metadata
    dept_name = meta.get("department_name")
    waiting = meta.get("waiting_count", 0)
    in_consult = meta.get("in_consultation_count", 0)
    wait_time = meta.get("estimated_wait", 0)
    room = meta.get("room", "Consultation Wing")

    if dept_name:
        if lang == "hi":
            ans = (
                f"🏥 {dept_name} - लाइव कतार स्थिति:\n"
                f"• निर्धारित कक्ष: {room}\n"
                f"• कतार में प्रतीक्षारत रोगी: {waiting} व्यक्ति\n"
                f"• वर्तमान परामर्श में: {in_consult} व्यक्ति\n"
                f"• नए पंजीकरण के लिए औसत प्रतीक्षा: ~{wait_time} मिनट\n"
                f"📢 सूचना: आपातकालीन और गंभीर रोगियों को प्राथमिकता दी जाती है।"
            )
        elif lang == "te":
            ans = (
                f"🏥 {dept_name} - లైవ్ క్యూ సమాచారం:\n"
                f"• కేటాయించిన గది: {room}\n"
                f"• క్యూలో వేచి ఉన్న రోగులు: {waiting} మంది\n"
                f"• ప్రస్తుతం సంప్రదింపుల్లో ఉన్నవారు: {in_consult} మంది\n"
                f"• సగటు నిరీక్షణ సమయం: ~{wait_time} నిమిషాలు\n"
                f"📢 గమనిక: అత్యవసర రోగులకు ట్రయాజ్ ఆధారంగా ప్రాధాన్యత ఇవ్వబడుతుంది."
            )
        else:
            ans = (
                f"🏥 Live Queue Status for {dept_name}:\n"
                f"• Consultation Room: {room}\n"
                f"• Patients Waiting in Line: {waiting}\n"
                f"• Currently in Consultation / Called: {in_consult}\n"
                f"• Estimated Wait for New Intakes: ~{wait_time} minutes\n"
                f"📢 Note: Patients are prioritized dynamically based on clinical triage urgency."
            )
    else:
        # Global hospital overview
        total_waiting = meta.get("total_waiting", 0)
        total_consulting = meta.get("total_consulting", 0)
        if lang == "hi":
            ans = (
                f"🏥 सिविल अस्पताल • वार्ड ए - कुल संचालन स्थिति:\n"
                f"• कुल प्रतीक्षारत रोगी: {total_waiting}\n"
                f"• कुल सक्रिय परामर्श: {total_consulting}\n"
                f"• ओपीडी समय: सुबह 8:00 से शाम 4:00 तक (आपातकालीन 24x7 खुला)"
            )
        elif lang == "te":
            ans = (
                f"🏥 సివిల్ హాస్పిటల్ • వార్డ్ A - మొత్తం నిర్వహణ స్థితి:\n"
                f"• మొత్తం వేచి ఉన్న రోగులు: {total_waiting}\n"
                f"• మొత్తం కన్సల్టేషన్‌లో ఉన్నవారు: {total_consulting}\n"
                f"• OPD సమయాలు: ఉదయం 8:00 నుండి సాయంత్రం 4:00 వరకు (ER 24x7 అందుబాటులో)"
            )
        else:
            ans = (
                f"🏥 Civil Hospital • Ward A Operations Overview:\n"
                f"• Total Patients Waiting across departments: {total_waiting}\n"
                f"• Total Consultations in Progress: {total_consulting}\n"
                f"• OPD Hours: Mon - Sat 8:00 AM - 4:00 PM (Emergency 24x7 Open)"
            )

    return PatientAssistantResponse(
        answer=ans,
        is_ai_generated=False,
        model="rag-deterministic-synthesizer",
        grounded_sources=sources,
        needs_staff_consultation=False,
        suggested_action="View Dynamic Queue",
    )


def _rag_deterministic_fallback(
    query: str,
    retrieved_chunks: List[RetrievedChunk],
    lang: str = "en",
    uhid: Optional[str] = None,
) -> PatientAssistantResponse:
    """
    High-precision, intent-driven deterministic RAG synthesizer.
    Routes queries to the exact grounded category without misattribution.
    """
    q = query.lower()
    sources = [chunk.document.title for chunk in retrieved_chunks] if retrieved_chunks else ["Civil Hospital Ward A"]

    # -------------------------------------------------------------
    # INTENT 1: Clinical Safety / Prescription / Dosage Refusal
    # -------------------------------------------------------------
    medical_keywords = [
        "medicine", "tablet", "pill", "syrup", "dosage", "prescribe", "cure", "disease",
        "diagnos", "antibiotic", "paracetamol", "painkiller", "dawa", "ilaj", "goli",
        "మందు", "చికిత్స", "మందులు", "డోస్"
    ]
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
            model="rag-deterministic-synthesizer",
            grounded_sources=["Clinical Safety Boundary Policy"],
            needs_staff_consultation=True,
            suggested_action="Consult On-Duty Doctor / Triage Nurse",
        )

    # -------------------------------------------------------------
    # INTENT 2: Emergency Helplines & Ambulance
    # -------------------------------------------------------------
    if any(k in q for k in [
        "ambulance", "emergency number", "emergency phone", "108", "102",
        "helpline", "hotline", "फोन", "अंबुलेस", "एम्बुलेंस", "అంబులెన్స్", "నంబర్"
    ]):
        if lang == "hi":
            ans = "🚨 आपातकालीन सेवाएं 24x7 उपलब्ध हैं:\n• राष्ट्रीय आपातकालीन एम्बुलेंस: 108 (टोल-फ्री)\n• सरकारी मेडिकल हेल्पलाइन: 102 (टोल-फ्री)\n• सिविल अस्पताल हेल्पडेस्क: 011-2399-4400\n• गंभीर स्थिति में सीधे भूतल पर कक्ष 101 (ER) में जाएं।"
        elif lang == "te":
            ans = "🚨 అత్యవసర సేవలు 24x7 అందుబాటులో ఉన్నాయి:\n• జాతీయ ఎమర్జెన్సీ అంబులెన్స్: 108 (టోల్ ఫ్రీ)\n• ప్రభుత్వ మెడికల్ హెల్ప్‌లైన్: 102 (టోల్ ఫ్రీ)\n• సివిల్ హాస్పిటల్ హెల్ప్‌డెస్క్: 011-2399-4400\n• అత్యవసర పరిస్థితిలో నేరుగా గ్రౌండ్ ఫ్లోర్‌లోని రూమ్ 101 (ER) వద్దకు వెళ్లండి."
        else:
            ans = "🚨 Emergency Services are available 24x7:\n• National Emergency Ambulance: 108 (Toll-Free, 24x7)\n• Government Medical Helpline: 102 (Toll-Free, 24x7)\n• Civil Hospital Ward A Emergency Desk: 011-2399-4400\n• In case of acute trauma or severe distress, proceed directly to Emergency Room 101 (Ground Floor)."

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="rag-deterministic-synthesizer",
            grounded_sources=["24x7 Emergency Helplines & Ambulance Dispatch"],
            needs_staff_consultation=False,
            suggested_action="Call 108 / 102 in critical emergency",
        )

    # -------------------------------------------------------------
    # INTENT 3: Specific Patient Token / UHID / Name Inquiry
    # -------------------------------------------------------------
    token_match = re.search(r"\b((?:SS|UHID|TK)-\d{4}-\d+|(?:SS|UHID|TK)-\d+)\b", query, re.IGNORECASE)
    match_num = re.search(r"\b(?:token|uhid|pass|no\.?|number|id|#)\s*[:#-]?\s*(\d{1,6})\b", query, re.IGNORECASE)

    explicit_token = token_match.group(1).upper() if token_match else (uhid.upper() if uhid else None)
    numeric_id = match_num.group(1).strip() if match_num else None

    # Only treat as patient lookup if explicit token/number or patient context query
    is_patient_lookup = bool(explicit_token or numeric_id or any(k in q for k in ["my token", "mera token", "naa token", "my wait", "mera number", "naa rank"]))

    if is_patient_lookup:
        for chunk in retrieved_chunks:
            if chunk.document.category == "PATIENT_RECORD":
                doc_uhid = str(chunk.document.metadata.get("uhid", "")).upper()
                doc_name = str(chunk.document.metadata.get("full_name", "")).lower()

                if explicit_token and (doc_uhid == explicit_token or explicit_token in doc_uhid):
                    return _format_patient_rag_response(chunk.document, lang, sources)

                if numeric_id and (doc_uhid.endswith(f"-{int(numeric_id):04d}") or doc_uhid.endswith(f"-{numeric_id}")):
                    return _format_patient_rag_response(chunk.document, lang, sources)

                name_parts = [p for p in doc_name.split() if len(p) > 2]
                if name_parts and any(p in q for p in name_parts):
                    return _format_patient_rag_response(chunk.document, lang, sources)

        # Fallback to top patient record if specific token was passed via parameter
        if uhid:
            for chunk in retrieved_chunks:
                if chunk.document.category == "PATIENT_RECORD":
                    return _format_patient_rag_response(chunk.document, lang, sources)

        # Explicit token searched was not found
        if token_match or (numeric_id and any(k in q for k in ["token", "status", "queue", "rank", "wait", "kab"])):
            searched = token_match.group(1).upper() if token_match else f"#{numeric_id}"
            if lang == "hi":
                not_found = f"⚠️ टोकन '{searched}' सक्रिय पंजीकरण रिकॉर्ड में नहीं मिला। कृपया अपने पर्चे की जांच करें या वार्ड ए के पंजीकरण डेस्क पर संपर्क करें।"
            elif lang == "te":
                not_found = f"⚠️ టోకెన్ '{searched}' ఆసుపత్రి రికార్డులలో కనుగొనబడలేదు. దయచేసి మీ రిజిస్ట్రేషన్ స్లిప్‌ను తనిఖీ చేయండి లేదా వార్డ్ A డెస్క్‌ను సంప్రదించండి."
            else:
                not_found = f"⚠️ Token '{searched}' was not found in active hospital records. Please verify the token number printed on your registration slip, or visit the Registration Desk in Ward A."

            return PatientAssistantResponse(
                answer=not_found,
                is_ai_generated=False,
                model="rag-deterministic-synthesizer",
                grounded_sources=["Hospital Registration Database"],
                needs_staff_consultation=True,
                suggested_action="Visit Registration Desk in Ward A",
            )

    # -------------------------------------------------------------
    # INTENT 4: Department Queue Load & Wait Time Counts
    # -------------------------------------------------------------
    if any(k in q for k in [
        "how many", "waiting", "queue", "busiest", "bhed", "rush", "load",
        "average wait", "how long", "kitne", "kitna time", "enta time", "chustunnaru", "line me"
    ]):
        for chunk in retrieved_chunks:
            if chunk.document.category == "DEPARTMENT_SNAPSHOT":
                return _format_department_snapshot_response(chunk.document, lang, sources)

    # -------------------------------------------------------------
    # INTENT 5: Triage Priority & "Why Called Before Me"
    # -------------------------------------------------------------
    if any(k in q for k in [
        "priority", "priorit", "triage", "score", "critical", "called first", "order", "urgent",
        "before me", "pahle", "ముందు", "प्राथमिकता", "క్యు"
    ]):
        if lang == "hi":
            ans = "सेहत सेतु में कतार का क्रम ट्राइएज गंभीरता (Triage Urgency) और आगमन समय पर आधारित होता है:\n• जीवन रक्षक प्राथमिकता: जिन रोगियों की ऑक्सीजन < 92% या सीने में तेज दर्द है, उन्हें तत्काल देखा जाता है।\n• गंभीर (HIGH): तेज बुखार या तीव्र हृदय गति (~10-15 मिनट प्रतीक्षा)।\n• मध्यम (MODERATE): सामान्य संक्रमण या दर्द (~25-40 मिनट प्रतीक्षा)।\n• सामान्य (LOW): हल्की तकलीफें (~45-60 मिनट प्रतीक्षा)।"
        elif lang == "te":
            ans = "సేహత్‌సేతులో క్యూ క్రమం ట్రయాజ్ అత్యవసరత మరియు వచ్చిన సమయం ఆధారంగా నిర్ణయించబడుతుంది:\n• అత్యవసరం (CRITICAL): ఆక్సిజన్ < 92% లేదా గుండె నొప్పి ఉన్న రోగులకు ప్రాణాపాయ నివారణకు తక్షణ ప్రాధాన్యత.\n• తీవ్రమైనది (HIGH): తీవ్ర జ్వరం లేదా గుండె వేగం (~10-15 నిమిషాలు).\n• మధ్యస్థం (MODERATE): సాధారణ ఇన్ఫెక్షన్లు (~25-40 నిమిషాలు).\n• సాధారణం (LOW): సాధారణ సమస్యలు (~45-60 నిమిషాలు)."
        else:
            ans = "SehatSetu prioritizes patients dynamically based on clinical triage urgency score and arrival duration:\n• Life-Saving Priority: Patients with critical vitals (e.g. SpO2 < 92%, acute cardiac distress) are called immediately.\n• HIGH: Urgent care indicated (~10-15 min wait).\n• MODERATE: Standard care indicated (~25-40 min wait).\n• LOW: Routine outpatient evaluation (~45-60 min wait)."

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="rag-deterministic-synthesizer",
            grounded_sources=["Deterministic Clinical Triage Rules & Queue Prioritization"],
            needs_staff_consultation=False,
            suggested_action="Review Triage Rules Policy",
        )

    # -------------------------------------------------------------
    # INTENT 6: Facility Locations & Department Rooms
    # -------------------------------------------------------------
    if any(k in q for k in [
        "department", "room", "where", "ward", "kamra", "kahan", "floor", "pharmacy", "lab",
        "cardiology", "orthopedic", "pediatric", "emergency", "medicine",
        "గది", "విభాగం", "ఎక్కడ", "101", "104", "108", "112", "115", "location"
    ]):
        if lang == "hi":
            ans = "सिविल अस्पताल (वार्ड ए) के विभाग एवं कक्ष विवरण:\n• आपातकालीन (ER): कक्ष 101 एवं 102 (24x7 खुला, भूतल)\n• जनरल मेडिसिन (OPD): कक्ष 104 एवं 105 (प्रथम तल)\n• कार्डियोलॉजी (हृदय रोग): कक्ष 108 (प्रथम तल)\n• ऑर्थोपेडिक्स (हड्डी रोग): कक्ष 112 (द्वितीय तल)\n• पीडियाट्रिक्स (बाल रोग): कक्ष 115 (द्वितीय तल)\n• फार्मेसी (दवा खाना): भूतल (24x7 खुला)\n• पैथोलॉजी लैब: कक्ष 103 (भूतल)"
        elif lang == "te":
            ans = "సివిల్ హాస్పిటల్ (వార్డ్ A) విభాగాలు & గదుల వివరాలు:\n• ఎమర్జెన్సీ (ER): రూమ్ 101 & 102 (24x7 అందుబాటులో, గ్రౌండ్ ఫ్లోర్)\n• జనరల్ మెడిసిన్ (OPD): రూమ్ 104 & 105 (మొదటి అంతస్తు)\n• కార్డియాలజీ: రూమ్ 108 (మొదటి అంతస్తు)\n• ఆర్థోపెడిక్స్: రూమ్ 112 (రెండవ అంతస్తు)\n• పీడియాట్రిక్స్: రూమ్ 115 (రెండవ అంతస్తు)\n• ఫార్మసీ: గ్రౌండ్ ఫ్లోర్ (24x7 అందుబాటులో)\n• పాథాలజీ ల్యాబ్: రూమ్ 103 (గ్రౌండ్ ఫ్లోర్)"
        else:
            ans = "Civil Hospital (Ward A) Departments & Facility Locations:\n• Emergency (ER): Rooms 101 & 102 (Ground Floor, 24x7 Open)\n• General Medicine: Rooms 104 & 105 (First Floor)\n• Cardiology: Room 108 (First Floor)\n• Orthopedics: Room 112 (Second Floor)\n• Pediatrics: Room 115 (Second Floor)\n• Pharmacy (Medicines): Ground Floor near ER (24x7 Open)\n• Diagnostic Pathology Lab: Room 103 (Ground Floor)"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="rag-deterministic-synthesizer",
            grounded_sources=["Hospital Departments & Consultation Room Directory"],
            needs_staff_consultation=False,
            suggested_action="Proceed to designated department room",
        )

    # -------------------------------------------------------------
    # INTENT 7: Baseline Vitals Reference
    # -------------------------------------------------------------
    if any(k in q for k in ["vital", "spo2", "oxygen", "pulse", "heart rate", "bp", "blood pressure", "temp", "fever", "रक्तचाप", "ఆక్సిజన్"]):
        if lang == "hi":
            ans = "सामान्य महत्वपूर्ण संकेत (केवल सामान्य जानकारी के लिए):\n• ऑक्सीजन (SpO2): 95% - 100% (92% से कम पर डॉक्टर तुरंत देखते हैं)\n• हृदय गति (Pulse): 60 - 100 bpm\n• रक्तचाप (BP): ~120/80 mmHg\n• तापमान: 97.8°F - 99.1°F (बुखार > 100.4°F)"
        elif lang == "te":
            ans = "ప్రామాణిక ముఖ్య సూచికలు (సాధారణ అవగాహన కోసం మాత్రమే):\n• ఆక్సిజన్ (SpO2): 95% - 100% (92% కంటే తక్కువ ఉంటే తక్షణ పరిశీలన)\n• పల్స్ / గుండె వేగం: 60 - 100 bpm\n• రక్తపోటు (BP): ~120/80 mmHg\n• ఉష్ణోగ్రత: 97.8°F - 99.1°F (జ్వరం > 100.4°F)"
        else:
            ans = "Normal Baseline Vital Ranges (Educational Reference Only):\n• Oxygen Saturation (SpO2): 95% - 100% (Below 92% is prioritized for rapid clinician review)\n• Pulse / Heart Rate: 60 - 100 bpm\n• Blood Pressure: ~120/80 mmHg\n• Body Temperature: 97.8°F - 99.1°F (Fever > 100.4°F)"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="rag-deterministic-synthesizer",
            grounded_sources=["Standard Clinical Baseline Vital Signs Reference"],
            needs_staff_consultation=False,
            suggested_action="Consult clinician for personalized readings",
        )

    # -------------------------------------------------------------
    # INTENT 8: Document Checklist
    # -------------------------------------------------------------
    if any(k in q for k in ["document", "bring", "carry", "aadhaar", "card", "kagaz", "తీసుకురావాలి", "పత్రాలు", "दस्तावेज"]):
        if lang == "hi":
            ans = "अस्पताल में परामर्श के लिए निम्नलिखित साथ रखें:\n1. आपका मुद्रित टोकन पर्चा या मोबाइल एसएमएस\n2. पहचान पत्र (आधार कार्ड / आयुष्मान भारत कार्ड)\n3. पुराने पर्चे, दवाइयां और टेस्ट रिपोर्ट"
        elif lang == "te":
            ans = "వైద్య సంప్రదింపుల కోసం దయచేసి వీటిని సిద్ధంగా ఉంచుకోండి:\n1. మీ ప్రింటెడ్ టోకెన్ స్లిప్ లేదా మొబైల్ SMS\n2. గుర్తింపు కార్డు (ఆధార్ లేదా ఆయుష్మాన్ భారత్ కార్డు)\n3. మునుపటి మెడికల్ రిపోర్టులు మరియు మందుల వివరాలు"
        else:
            ans = "Please keep the following ready for your consultation:\n1. Your printed UHID Token slip or SMS alert\n2. Government ID (Aadhaar or Ayushman Bharat card)\n3. Past medical records, test reports, and current medication list"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="rag-deterministic-synthesizer",
            grounded_sources=["Patient Registration & Consultation Document Checklist"],
            needs_staff_consultation=False,
            suggested_action="Keep token and ID ready",
        )

    # -------------------------------------------------------------
    # INTENT 9: Operating Hours & General Overview
    # -------------------------------------------------------------
    if any(k in q for k in ["timing", "hour", "open", "close", "samay", "kab khulta", "సమయం"]):
        if lang == "hi":
            ans = "सिविल अस्पताल (वार्ड ए) संचालन समय:\n• आपातकालीन विभाग (ER): 24 घंटे, सातों दिन खुला (24x7, भूतल)\n• ओपीडी परामर्श: सोमवार से शनिवार, सुबह 8:00 से शाम 4:00 बजे तक\n• हेल्पडेस्क फोन: 011-2399-4400"
        elif lang == "te":
            ans = "సివిల్ హాస్పిటల్ (వార్డ్ A) పని వేళలు:\n• ఎమర్జెన్సీ విభాగం (ER): 24 గంటలు, రోజూ అందుబాటులో (24x7, గ్రౌండ్ ఫ్లోర్)\n• OPD సంప్రదింపులు: సోమవారం నుండి శనివారం, ఉదయం 8:00 నుండి సాయంత్రం 4:00 వరకు\n• హెల్ప్‌డెస్క్ ఫోన్: 011-2399-4400"
        else:
            ans = "Civil Hospital (Ward A) Operating Hours:\n• Emergency Department (ER): Open 24 hours a day, 7 days a week (24x7, Ground Floor)\n• Outpatient (OPD) Consultations: Monday through Saturday, 8:00 AM - 4:00 PM\n• General Helpdesk: 011-2399-4400"

        return PatientAssistantResponse(
            answer=ans,
            is_ai_generated=False,
            model="rag-deterministic-synthesizer",
            grounded_sources=["Civil Hospital Ward A - Facility & Operating Hours"],
            needs_staff_consultation=False,
            suggested_action="Check Hospital Hours",
        )

    # Default General Overview
    if lang == "hi":
        ans = "सेहत सेतु (SehatSetu) सिविल अस्पताल • वार्ड ए का स्मार्ट रोगी कतार एवं आपातकालीन ट्राइएज प्लेटफॉर्म है। यह पारदर्शी, नियम-आधारित ट्राइएज और वास्तविक समय में कतार प्रबंधन प्रदान करता है।"
    elif lang == "te":
        ans = "సేహత్‌సేతు (SehatSetu) అనేది సివిల్ హాస్పిటల్ • వార్డ్ A యొక్క స్మార్ట్ పేషెంట్ క్యూ మరియు ఎమర్జెన్సీ ట్రయాజ్ వ్యవస్థ. ఇది రియల్-టైమ్ క్యూ నిర్వహణ మరియు వైద్య సహాయాన్ని అందిస్తుంది."
    else:
        ans = "SehatSetu is the Smart Patient Queue & Emergency Triage Platform deployed at Civil Hospital • Ward A. It provides deterministic, clinician-auditable triage prioritization and live token tracking."

    return PatientAssistantResponse(
        answer=ans,
        is_ai_generated=False,
        model="rag-deterministic-synthesizer",
        grounded_sources=sources,
        needs_staff_consultation=False,
        suggested_action="Explore Hospital Services",
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

    fallback_summary = _extractive_rule_fallback(complaint)
    return AISummarizeResponse(
        summary=fallback_summary,
        is_ai_generated=False,
        model="extractive-fallback",
    )


async def solve_patient_doubt(request: PatientAssistantRequest) -> PatientAssistantResponse:
    """
    Production RAG Pipeline for Patient Assistant:
    1. Retrieval: Multi-signal hybrid TF-IDF + exact token/name match + live department snapshot extraction.
    2. Augmentation: Injects retrieved chunks and clinical safety constraints into the grounded prompt.
    3. Generation: Invokes Gemini LLM (or deterministic RAG synthesizer fallback) for accurate, grounded responses.
    """
    query = request.question.strip()
    lang = request.language or "en"
    uhid = request.patient_uhid

    # 1. RAG Retrieval Phase: Retrieve Top-5 most relevant chunks
    retrieved_chunks = rag_retriever.retrieve(query=query, uhid=uhid, top_k=5)
    sources = [c.document.title for c in retrieved_chunks]

    api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY", "")

    # 2. RAG Generation Phase with Gemini (if configured and enabled)
    if settings.ENABLE_AI_SUMMARIZATION and api_key:
        try:
            # Build structured context from retrieved chunks
            context_blocks = []
            for i, chunk in enumerate(retrieved_chunks, 1):
                context_blocks.append(
                    f"--- RETRIEVED CHUNK {i} (Title: {chunk.document.title}, Category: {chunk.document.category}, Score: {chunk.similarity_score:.2f}) ---\n"
                    f"{chunk.document.content}\n"
                )
            retrieved_context_str = "\n".join(context_blocks)

            prompt_text = (
                f"{RAG_GROUNDED_PROMPT_TEMPLATE.format(retrieved_context=retrieved_context_str)}\n\n"
                f"USER QUERY: \"{query}\"\n"
                f"DESIRED RESPONSE LANGUAGE: {lang}\n\n"
                f"Provide a clear, accurate, polite, grounded response using the retrieved knowledge chunks above."
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
                    "maxOutputTokens": 400,
                },
            }

            async with httpx.AsyncClient(timeout=4.5) as client:
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
                                grounded_sources=sources,
                                needs_staff_consultation=needs_consult,
                                suggested_action="Consult Staff" if needs_consult else "Follow Hospital Guidance",
                            )
        except Exception as e:
            print(f"[RAG Service Warning] Gemini generation failed, falling back to deterministic RAG synthesizer: {e}")

    # 3. Deterministic RAG Fallback Synthesizer
    return _rag_deterministic_fallback(query, retrieved_chunks, lang, uhid)
