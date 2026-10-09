from fastapi import APIRouter
from app.api.v1.endpoints import health, departments, patients, visits, queue, triage, audit

api_router = APIRouter()

# Register endpoint routers
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(departments.router, prefix="/departments", tags=["Departments"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients & Intake"])
api_router.include_router(visits.router, prefix="/visits", tags=["Visits"])
api_router.include_router(queue.router, prefix="/queue", tags=["Dynamic Queue"])
api_router.include_router(triage.router, prefix="/triage", tags=["Triage Rules Engine"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit History"])
