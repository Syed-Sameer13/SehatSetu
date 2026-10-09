import re
from typing import List, Tuple
from app.schemas.triage import VitalObservations, UrgencyCategoryType


# Clinical Base Weights for Urgency Categories
URGENCY_WEIGHTS = {
    "CRITICAL": 10000,
    "HIGH": 5000,
    "MODERATE": 2000,
    "LOW": 500,
    "NEEDS_REVIEW": 1000,
}

# Red-flag symptom patterns
RED_FLAG_PATTERNS = [
    (r"\b(chest pain|substernal|angina|cardiac)\b.*\b(arm|jaw|back|sweat|diaphoresis|shortness of breath|dyspnea)\b", "High-Risk Cardiac Presentation: Chest pain with radiation or diaphoresis"),
    (r"\b(crushing chest (pain|pressure)|acute myocardial infarction|heart attack)\b", "Critical Cardiac Alert: Crushing chest pain/pressure"),
    (r"\b(facial droop|slurred speech|arm weakness|hemiparesis|stroke|cva)\b", "Acute Stroke Alert: Neurological deficit flags"),
    (r"\b(unresponsive|unconscious|coma|collapsed|syncope with trauma)\b", "Altered Consciousness / Unresponsive Presentation"),
    (r"\b(stridor|severe respiratory distress|cyanosis|blue lips|gasping)\b", "Severe Airway / Respiratory Compromise"),
    (r"\b(uncontrolled (bleeding|hemorrhage)|arterial bleed|severe open fracture|penetrating trauma)\b", "Major Hemorrhage / Critical Trauma Alert"),
    (r"\b(anaphylaxis|swollen (throat|tongue)|acute allergic reaction with wheeze)\b", "Severe Anaphylaxis / Airway Obstruction Risk"),
]


class TriageEvaluationResult:
    def __init__(
        self,
        urgency_category: UrgencyCategoryType,
        urgency_score: int,
        rule_evidence: List[str],
        missing_vital_flags: List[str],
    ):
        self.urgency_category = urgency_category
        self.urgency_score = urgency_score
        self.rule_evidence = rule_evidence
        self.missing_vital_flags = missing_vital_flags


def evaluate_triage(
    vitals: VitalObservations,
    chief_complaint: str = "",
    age: int = 30,
) -> TriageEvaluationResult:
    """
    Deterministic clinical triage evaluation rules engine.
    Computes an explainable urgency score (0-100) and assigns an urgency category.
    """
    score = 0
    evidence: List[str] = []
    missing_flags: List[str] = []
    is_critical_flagged = False
    is_high_flagged = False

    # --------------------------------------------------------------------------
    # 1. Red-Flag Symptom Pattern Matching
    # --------------------------------------------------------------------------
    complaint_lower = chief_complaint.lower() if chief_complaint else ""
    for pattern, description in RED_FLAG_PATTERNS:
        if re.search(pattern, complaint_lower):
            score += 50
            is_critical_flagged = True
            evidence.append(description)

    # --------------------------------------------------------------------------
    # 2. Oxygen Saturation (SpO2)
    # --------------------------------------------------------------------------
    if vitals.spo2 is not None:
        if vitals.spo2 < 88:
            score += 50
            is_critical_flagged = True
            evidence.append(f"Critical Hypoxia: SpO2 < 88% (recorded: {vitals.spo2}%)")
        elif vitals.spo2 <= 91:
            score += 35
            is_high_flagged = True
            evidence.append(f"Marked Hypoxemia: SpO2 between 88-91% (recorded: {vitals.spo2}%)")
        elif vitals.spo2 <= 94:
            score += 15
            evidence.append(f"Mild Hypoxemia: SpO2 between 92-94% (recorded: {vitals.spo2}%)")
    else:
        missing_flags.append("spo2")

    # --------------------------------------------------------------------------
    # 3. Heart Rate (Pulse)
    # --------------------------------------------------------------------------
    if vitals.heart_rate is not None:
        hr = vitals.heart_rate
        if hr > 135 or hr < 40:
            score += 45
            is_critical_flagged = True
            evidence.append(f"Extreme Heart Rate Deviation: {hr} bpm (Normal: 60-100 bpm)")
        elif hr > 115 or hr < 50:
            score += 30
            is_high_flagged = True
            evidence.append(f"Marked Tachycardia/Bradycardia: {hr} bpm")
        elif hr > 100 or hr < 60:
            score += 10
            evidence.append(f"Mild Heart Rate Elevation/Depression: {hr} bpm")
    else:
        missing_flags.append("heart_rate")

    # --------------------------------------------------------------------------
    # 4. Blood Pressure (Systolic & Diastolic)
    # --------------------------------------------------------------------------
    if vitals.systolic_bp is not None:
        sbp = vitals.systolic_bp
        if sbp >= 180 or sbp < 80:
            score += 45
            is_critical_flagged = True
            evidence.append(f"Hypertensive Crisis / Severe Hypotension: Systolic BP {sbp} mmHg")
        elif sbp >= 150 or sbp < 90:
            score += 25
            is_high_flagged = True
            evidence.append(f"Elevated / Low Systolic BP: {sbp} mmHg")
        elif sbp > 135:
            score += 10
            evidence.append(f"Stage 1 Hypertension: Systolic BP {sbp} mmHg")
    else:
        missing_flags.append("systolic_bp")

    # --------------------------------------------------------------------------
    # 5. Respiratory Rate
    # --------------------------------------------------------------------------
    if vitals.respiratory_rate is not None:
        rr = vitals.respiratory_rate
        if rr > 32 or rr < 8:
            score += 45
            is_critical_flagged = True
            evidence.append(f"Severe Tachypnea/Bradypnea: {rr} breaths/min")
        elif rr >= 24 or rr < 10:
            score += 25
            is_high_flagged = True
            evidence.append(f"Abnormal Respiratory Rate: {rr} breaths/min")
    else:
        missing_flags.append("respiratory_rate")

    # --------------------------------------------------------------------------
    # 6. Body Temperature
    # --------------------------------------------------------------------------
    if vitals.temperature_f is not None:
        temp = vitals.temperature_f
        if temp > 103.5 or temp < 95.0:
            score += 35
            is_high_flagged = True
            evidence.append(f"Severe Hyperthermia / Hypothermia: {temp}°F")
        elif temp > 101.5:
            score += 20
            evidence.append(f"High Fever: {temp}°F")
        elif temp > 99.5:
            score += 10
            evidence.append(f"Low-Grade Fever: {temp}°F")

    # --------------------------------------------------------------------------
    # 7. Glasgow Coma Scale (GCS)
    # --------------------------------------------------------------------------
    if vitals.gcs is not None:
        if vitals.gcs <= 11:
            score += 50
            is_critical_flagged = True
            evidence.append(f"Depressed Mental Status: GCS {vitals.gcs}/15")
        elif vitals.gcs <= 13:
            score += 30
            is_high_flagged = True
            evidence.append(f"Mildly Altered Mental Status: GCS {vitals.gcs}/15")

    # --------------------------------------------------------------------------
    # 8. Blood Glucose
    # --------------------------------------------------------------------------
    if vitals.blood_glucose_mg_dl is not None:
        bg = vitals.blood_glucose_mg_dl
        if bg > 350 or bg < 45:
            score += 40
            is_critical_flagged = True
            evidence.append(f"Severe Glucose Derangement: {bg} mg/dL")
        elif bg > 200 or bg < 60:
            score += 20
            evidence.append(f"Abnormal Blood Glucose: {bg} mg/dL")

    # --------------------------------------------------------------------------
    # 9. Cap score to 0-100 range and map to Urgency Category
    # --------------------------------------------------------------------------
    capped_score = min(max(score, 0), 100)

    if is_critical_flagged or capped_score >= 80:
        category: UrgencyCategoryType = "CRITICAL"
        capped_score = max(capped_score, 85)
    elif is_high_flagged or capped_score >= 55:
        category = "HIGH"
        capped_score = max(capped_score, 60)
    elif capped_score >= 30:
        category = "MODERATE"
    else:
        # Check if critical vitals are missing when symptoms are present
        if len(missing_flags) >= 3 and len(evidence) == 0:
            category = "NEEDS_REVIEW"
        else:
            category = "LOW"

    if not evidence:
        evidence.append("Stable physiological parameters recorded.")

    return TriageEvaluationResult(
        urgency_category=category,
        urgency_score=capped_score,
        rule_evidence=evidence,
        missing_vital_flags=missing_flags,
    )
