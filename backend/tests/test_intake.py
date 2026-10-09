import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_list_departments():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/departments")
        assert response.status_code == 200
        depts = response.json()
        assert len(depts) >= 3
        codes = [d["code"] for d in depts]
        assert "EMERGENCY" in codes
        assert "GEN_MED" in codes


@pytest.mark.asyncio
async def test_patient_intake_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "full_name": "Aarav Sharma",
            "age": 48,
            "gender": "MALE",
            "phone_number": "+91-9876543210",
            "department_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
            "chief_complaint": "Acute severe substernal chest pain with diaphoresis",
            "vital_observations": {
                "systolic_bp": 165,
                "diastolic_bp": 102,
                "heart_rate": 118,
                "spo2": 91,
                "temperature_f": 98.6,
            }
        }
        response = await client.post("/api/v1/patients/intake", json=payload)
        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["patient"]["full_name"] == "Aarav Sharma"
        assert data["data"]["visit"]["status"] == "WAITING"
        assert data["data"]["triage_assessment"]["urgency_category"] == "CRITICAL"
        assert data["data"]["queue_position"] >= 1


@pytest.mark.asyncio
async def test_patient_intake_validation_error():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "full_name": "A", # Too short (min_length=2)
            "age": 200, # Invalid age (> 130)
            "gender": "INVALID_GENDER",
            "department_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
            "chief_complaint": "Short",
        }
        response = await client.post("/api/v1/patients/intake", json=payload)
        assert response.status_code == 422
