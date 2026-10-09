from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime
from app.schemas.triage import VitalObservations

VisitStatusType = Literal["WAITING", "CALLED", "IN_CONSULTATION", "COMPLETED", "CANCELLED"]


class VisitBase(BaseModel):
    department_id: str = Field(..., description="Target department UUID")
    chief_complaint: str = Field(..., min_length=3, description="Patient chief complaint narrative")
    vital_observations: VitalObservations = Field(default_factory=VitalObservations)


class VisitCreate(VisitBase):
    patient_id: str = Field(..., description="Patient ID")


class VisitResponse(VisitBase):
    id: str
    patient_id: str
    doctor_id: Optional[str] = None
    status: VisitStatusType = "WAITING"
    arrival_time: datetime
    called_at: Optional[datetime] = None
    consultation_started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
