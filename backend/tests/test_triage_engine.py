import pytest
from app.services.triage_engine import evaluate_triage
from app.schemas.triage import VitalObservations


def test_hypoxia_critical():
    vitals = VitalObservations(spo2=86, heart_rate=90, systolic_bp=120)
    res = evaluate_triage(vitals, "Shortness of breath")
    assert res.urgency_category == "CRITICAL"
    assert res.urgency_score >= 85
    assert any("SpO2 < 88%" in ev for ev in res.rule_evidence)


def test_cardiac_red_flag_symptom():
    vitals = VitalObservations(spo2=98, heart_rate=88, systolic_bp=130)
    res = evaluate_triage(vitals, "Crushing chest pain radiating to left arm with diaphoresis")
    assert res.urgency_category == "CRITICAL"
    assert any("Cardiac" in ev for ev in res.rule_evidence)


def test_stroke_alert_symptom():
    vitals = VitalObservations(spo2=97, heart_rate=76, systolic_bp=140)
    res = evaluate_triage(vitals, "Sudden onset slurred speech and right arm weakness")
    assert res.urgency_category == "CRITICAL"
    assert any("Stroke Alert" in ev for ev in res.rule_evidence)


def test_high_fever_and_tachycardia():
    vitals = VitalObservations(
        spo2=96, heart_rate=120, systolic_bp=115, temperature_f=103.0
    )
    res = evaluate_triage(vitals, "Fever and chills for 2 days")
    assert res.urgency_category in ["CRITICAL", "HIGH"]
    assert res.urgency_score >= 60


def test_stable_low_urgency():
    vitals = VitalObservations(
        spo2=99,
        heart_rate=72,
        systolic_bp=118,
        diastolic_bp=78,
        respiratory_rate=16,
        temperature_f=98.4,
    )
    res = evaluate_triage(vitals, "Minor finger sprain yesterday")
    assert res.urgency_category == "LOW"
    assert res.urgency_score <= 30


def test_missing_vitals_detection():
    vitals = VitalObservations(temperature_f=98.6)
    res = evaluate_triage(vitals, "Routine follow-up")
    assert "spo2" in res.missing_vital_flags
    assert "heart_rate" in res.missing_vital_flags
    assert "systolic_bp" in res.missing_vital_flags
