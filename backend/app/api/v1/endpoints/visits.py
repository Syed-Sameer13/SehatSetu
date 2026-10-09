from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.schemas.visit import VisitResponse
from app.schemas.patient import PatientResponse
from app.schemas.triage import TriageAssessmentResponse
from app.services.storage import store

router = APIRouter()


class VisitDetailResponse(BaseModel):
    visit: VisitResponse
    patient: PatientResponse
    triage_assessment: Optional[TriageAssessmentResponse] = None


@router.get("/{visit_id}", response_model=VisitDetailResponse, tags=["Visits"])
async def get_visit_details(visit_id: str):
    """
    Retrieve full visit details, including patient demographics and triage assessment.
    """
    visit = store.get_visit_by_id(visit_id)
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Visit with ID '{visit_id}' not found."
        )

    patient = store.get_patient_by_id(visit.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated patient record not found."
        )

    triage = store.get_triage_by_visit_id(visit_id)

    return VisitDetailResponse(
        visit=visit,
        patient=patient,
        triage_assessment=triage,
    )
