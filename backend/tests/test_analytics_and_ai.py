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
