from pydantic import BaseModel, Field
from typing import Optional
from app.schemas.patient import PatientBase, PatientResponse
from app.schemas.triage import VitalObservations, TriageAssessmentResponse
from app.schemas.visit import VisitResponse


class PatientIntakeRequest(PatientBase):
    uhid: Optional[str] = Field(None, description="Existing UHID if patient is returning")
    department_id: str = Field(..., description="Assigned Department UUID")
    chief_complaint: str = Field(..., min_length=3, description="Reported symptoms & chief complaint")
    vital_observations: VitalObservations = Field(default_factory=VitalObservations)


class PatientIntakeData(BaseModel):
    patient: PatientResponse
    visit: VisitResponse
    triage_assessment: TriageAssessmentResponse
    queue_position: int = Field(1, description="Current estimated position in department queue")


class PatientIntakeResponse(BaseModel):
    success: bool = True
    data: PatientIntakeData
    message: str = "Patient registered and preliminary triage assessment completed successfully"
