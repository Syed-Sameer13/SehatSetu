import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analytics_overview():
    response = client.get("/api/v1/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_registered_today" in data
    assert "currently_waiting" in data
    assert "urgency_distribution" in data
    assert "department_load" in data
    assert "hourly_intake_trend" in data
    assert isinstance(data["department_load"], list)


def test_ai_symptom_summarizer():
    payload = {
        "chief_complaint": "Patient presents with acute substernal chest pressure radiating to left arm for 45 minutes with diaphoresis."
    }
    response = client.post("/api/v1/ai/summarize-symptoms", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert len(data["summary"]) > 0
    assert data["safety_disclaimer"] is not None


def test_ai_patient_assistant_queue_doubt():
    payload = {
        "question": "What is my current queue rank and how long do I need to wait?",
        "language": "en",
        "patient_uhid": "UHID-2026-0089",
        "patient_context": {"queue_position": 2, "estimated_wait_minutes": 15, "department_name": "General Medicine"},
    }
    response = client.post("/api/v1/ai/patient-assistant", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "UHID-2026-0089" in data["answer"]
    assert "15" in data["answer"]


def test_ai_patient_assistant_prescription_refusal():
    # If patient asks for medication/dosage, assistant MUST refuse and instruct doctor consultation
    payload = {
        "question": "Can you prescribe me medicine or tablets for my high fever and headache?",
        "language": "en",
    }
    response = client.post("/api/v1/ai/patient-assistant", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert data["needs_staff_consultation"] is True
    assert "doctor" in data["answer"].lower() or "triage nurse" in data["answer"].lower()


def test_ai_patient_assistant_hindi_and_telugu():
    # Hindi query
    res_hi = client.post("/api/v1/ai/patient-assistant", json={"question": "आपातकालीन विभाग कहाँ है?", "language": "hi"})
    assert res_hi.status_code == 200
    assert "101" in res_hi.json()["answer"]

    # Telugu query
    res_te = client.post("/api/v1/ai/patient-assistant", json={"question": "ఎమర్జెన్సీ గది ఎక్కడ ఉంది?", "language": "te"})
    assert res_te.status_code == 200
    assert "101" in res_te.json()["answer"]

