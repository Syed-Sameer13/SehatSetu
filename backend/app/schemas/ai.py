from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class AISummarizeRequest(BaseModel):
    chief_complaint: str = Field(..., min_length=3, description="Raw narrative symptoms from patient or nurse")


class AISummarizeResponse(BaseModel):
    summary: str
    is_ai_generated: bool = True
    model: str = "gemini-1.5-flash"
    safety_disclaimer: str = "Extractive summary for clinical review only; not an automated diagnosis."


class PatientAssistantRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=500, description="Patient doubt or question")
    language: Optional[str] = Field("en", description="Language code: en, hi, or te")
    patient_uhid: Optional[str] = Field(None, description="Optional patient UHID token")
    patient_context: Optional[Dict[str, Any]] = Field(None, description="Optional current queue context")


class PatientAssistantResponse(BaseModel):
    answer: str
    is_ai_generated: bool = True
    model: str = "gemini-1.5-flash"
    grounded_sources: List[str] = Field(default_factory=list)
    needs_staff_consultation: bool = False
    suggested_action: Optional[str] = None
    safety_notice: str = "Grounded hospital assistant. For clinical diagnosis or prescriptions, please consult your doctor."

