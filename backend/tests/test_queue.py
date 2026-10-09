import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_queue_sorting_by_urgency_and_wait():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch Emergency queue
        response = await client.get("/api/v1/queue?department_id=9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
        assert response.status_code == 200
        queue = response.json()
        assert len(queue) >= 2

        # Verify ranking
        ranks = [entry["calculated_priority_rank"] for entry in queue]
        assert ranks == sorted(ranks, reverse=True)


@pytest.mark.asyncio
async def test_call_next_patient():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Call next patient in ER
        payload = {
            "department_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
            "room_or_desk": "OPD Room 3",
        }
        response = await client.post("/api/v1/queue/call-next", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["status"] == "CALLED"


@pytest.mark.asyncio
async def test_triage_override_and_audit():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Override visit
        visit_id = "v1-rajesh-patel"
        override_payload = {
            "override_category": "CRITICAL",
            "override_reason": "Patient suddenly developed diaphoresis and altered sensorium upon physical inspection.",
        }
        res = await client.post(f"/api/v1/triage/{visit_id}/override", json=override_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["urgency_category"] == "CRITICAL"
        assert data["is_overridden"] is True

        # Check audit logs
        audit_res = await client.get("/api/v1/audit/logs")
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert any(l["action_type"] == "PRIORITY_OVERRIDE" for l in logs)
