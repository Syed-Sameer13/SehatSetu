from pydantic import BaseModel, Field


class AISummarizeRequest(BaseModel):
    chief_complaint: str = Field(..., min_length=3, description="Raw narrative symptoms from patient or nurse")


class AISummarizeResponse(BaseModel):
    summary: str
    is_ai_generated: bool = True
    model: str = "gemini-1.5-flash"
    safety_disclaimer: str = "Extractive summary for clinical review only; not an automated diagnosis."
