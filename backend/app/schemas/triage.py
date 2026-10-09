from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Literal
from datetime import datetime

UrgencyCategoryType = Literal["CRITICAL", "HIGH", "MODERATE", "LOW", "NEEDS_REVIEW"]


class VitalObservations(BaseModel):
    systolic_bp: Optional[int] = Field(None, ge=40, le=300, description="Systolic Blood Pressure (mmHg)")
    diastolic_bp: Optional[int] = Field(None, ge=20, le=200, description="Diastolic Blood Pressure (mmHg)")
    heart_rate: Optional[int] = Field(None, ge=20, le=300, description="Heart Rate (bpm)")
    respiratory_rate: Optional[int] = Field(None, ge=4, le=80, description="Respiratory Rate (breaths/min)")
    spo2: Optional[int] = Field(None, ge=0, le=100, description="Oxygen Saturation (% SpO2)")
    temperature_f: Optional[float] = Field(None, ge=80.0, le=115.0, description="Body Temperature (°F)")
    blood_glucose_mg_dl: Optional[int] = Field(None, ge=20, le=1000, description="Random Blood Glucose (mg/dL)")
    gcs: Optional[int] = Field(None, ge=3, le=15, description="Glasgow Coma Scale (3-15)")


class TriageAssessmentBase(BaseModel):
    urgency_category: UrgencyCategoryType = Field("NEEDS_REVIEW", description="Triage urgency classification")
    urgency_score: int = Field(0, ge=0, le=100, description="Calculated urgency score 0-100")
    rule_evidence: List[str] = Field(default_factory=list, description="List of triggered physiological rule flags")
    missing_vital_flags: List[str] = Field(default_factory=list, description="Omitted vital sign warnings")
    ai_symptom_summary: Optional[str] = Field(None, description="Optional extractive symptom summary")
    is_overridden: bool = Field(False, description="Whether priority was manually overridden")
    override_reason: Optional[str] = Field(None, description="Reason for clinical priority override")


class TriageAssessmentResponse(TriageAssessmentBase):
    id: str
    visit_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
