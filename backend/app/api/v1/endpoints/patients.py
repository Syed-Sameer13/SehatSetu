from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.schemas.patient import PatientResponse
from app.schemas.intake import PatientIntakeRequest, PatientIntakeResponse
from app.services.storage import store

router = APIRouter()


@router.post("/intake", response_model=PatientIntakeResponse, status_code=status.HTTP_201_CREATED, tags=["Patient Intake & Registration"])
async def register_patient_intake(intake: PatientIntakeRequest):
    """
    Register a patient arrival, store demographic details & vitals, and assign preliminary triage queue position.
    """
    dept = store.get_department_by_id(intake.department_id)
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department with ID '{intake.department_id}' not found."
        )

    intake_data = store.process_intake(intake)
    return PatientIntakeResponse(
        success=True,
        data=intake_data,
        message="Patient registered and preliminary triage assessment completed successfully"
    )


@router.get("", response_model=List[PatientResponse], tags=["Patients"])
async def list_patients(search: Optional[str] = Query(None, description="Search by name or UHID")):
    """
    Search and list registered patients.
    """
    return store.get_patients(search)


@router.get("/{patient_id}", response_model=PatientResponse, tags=["Patients"])
async def get_patient(patient_id: str):
    """
    Retrieve single patient demographic details.
    """
    patient = store.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{patient_id}' not found."
        )
    return patient
