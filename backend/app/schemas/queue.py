from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from app.schemas.triage import UrgencyCategoryType, VitalObservations
from app.schemas.visit import VisitStatusType


class QueueEntryResponse(BaseModel):
    visit_id: str
    patient_id: str
    uhid: str
    full_name: str
    age: int
    gender: str
    department_id: str
    department_name: str
    urgency_category: UrgencyCategoryType
    urgency_score: int
    status: VisitStatusType
    arrival_time: datetime
    waiting_duration_minutes: int
    calculated_priority_rank: int
    chief_complaint: str
    rule_evidence: list[str] = []
    vital_observations: VitalObservations = Field(default_factory=VitalObservations)
    is_overridden: bool = False
    override_reason: Optional[str] = None


class CallNextRequest(BaseModel):
    department_id: str = Field(..., description="Department ID to call next patient from")
    room_or_desk: Optional[str] = Field("Consultation Room 1", description="Duty station or room")


class CallNextResponse(BaseModel):
    success: bool = True
    data: Optional[QueueEntryResponse] = None
    message: str


class StatusUpdateRequest(BaseModel):
    status: VisitStatusType = Field(..., description="Target visit status")
    notes: Optional[str] = Field(None, description="Optional clinical note")


class TriageOverrideRequest(BaseModel):
    override_category: UrgencyCategoryType = Field(..., description="New clinical urgency category")
    override_reason: str = Field(..., min_length=5, description="Mandatory rationale for clinical override")
