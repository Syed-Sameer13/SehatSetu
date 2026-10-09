import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.rag_engine import rag_retriever, build_dynamic_patient_chunks

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
    assert len(data.get("grounded_sources", [])) > 0


def test_ai_patient_assistant_token_lookup():
    # First, register a new patient to generate an explicit token
    intake_res = client.post(
        "/api/v1/patients/intake",
        json={
            "full_name": "Kavita Rao",
            "age": 34,
            "gender": "FEMALE",
            "department_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
            "chief_complaint": "Severe acute left lower quadrant abdominal pain with fever.",
            "vital_observations": {
                "spo2": 98,
                "heart_rate": 88,
                "systolic_bp": 120,
                "diastolic_bp": 80,
                "temperature_f": 101.2,
            },
        },
    )
    assert intake_res.status_code in [200, 201]
    token_uhid = intake_res.json()["data"]["patient"]["uhid"]

    # Test Chatbot lookup by Token ID
    response = client.post(
        "/api/v1/ai/patient-assistant",
        json={
            "question": f"What is the status of token {token_uhid}?",
            "language": "en",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "Kavita Rao" in data["answer"]
    assert token_uhid in data["answer"]
    assert "101" in data["answer"]  # Emergency Department Room 101
    assert any("Kavita Rao" in s or "Patient Record" in s for s in data["grounded_sources"])

    # Test Token lookup in Hindi
    res_hi = client.post(
        "/api/v1/ai/patient-assistant",
        json={
            "question": f"टोकन {token_uhid} की जानकारी दें",
            "language": "hi",
        },
    )
    assert res_hi.status_code == 200
    assert "Kavita Rao" in res_hi.json()["answer"]
    assert "रोगी टोकन विवरण" in res_hi.json()["answer"]

    # Test Token lookup in Telugu
    res_te = client.post(
        "/api/v1/ai/patient-assistant",
        json={
            "question": f"టోకెన్ {token_uhid} సమాచారం ఏమిటి?",
            "language": "te",
        },
    )
    assert res_te.status_code == 200
    assert "Kavita Rao" in res_te.json()["answer"]
    assert "రోగి టోకెన్ వివరాలు" in res_te.json()["answer"]


def test_ai_patient_assistant_unknown_token():
    response = client.post(
        "/api/v1/ai/patient-assistant",
        json={
            "question": "What is the status of token SS-2026-9999?",
            "language": "en",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "not found" in data["answer"].lower()
    assert "Registration Desk" in data["answer"] or "registration" in data["answer"].lower()


def test_ai_patient_assistant_prescription_refusal():
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


def test_rag_retrieval_engine():
    # 1. Test dynamic patient chunk indexing
    chunks = build_dynamic_patient_chunks()
    assert len(chunks) > 0
    assert chunks[0].category == "PATIENT_RECORD"
    assert "Token ID" in chunks[0].content

    # 2. Test RAG retriever scoring for room directory
    retrieved = rag_retriever.retrieve(query="Where is cardiology and pediatric room?", top_k=2)
    assert len(retrieved) == 2
    assert any("Directory" in r.document.title or "Facility" in r.document.title or r.document.category == "DEPARTMENT_DIRECTORY" for r in retrieved)

    # 3. Test RAG retriever scoring for emergency hotline
    retrieved_hotline = rag_retriever.retrieve(query="What is the 108 ambulance emergency number?", top_k=2)
    assert any("Emergency" in r.document.title or r.document.category == "EMERGENCY_HOTLINE" for r in retrieved_hotline)
