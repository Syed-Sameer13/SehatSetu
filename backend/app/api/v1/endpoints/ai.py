from fastapi import APIRouter
from app.schemas.ai import (
    AISummarizeRequest,
    AISummarizeResponse,
    PatientAssistantRequest,
    PatientAssistantResponse,
)
from app.services.ai_service import summarize_chief_complaint, solve_patient_doubt

router = APIRouter()


@router.post("/summarize-symptoms", response_model=AISummarizeResponse)
async def summarize_symptoms(payload: AISummarizeRequest) -> AISummarizeResponse:
    """
    Extracts concise, structured clinical bullet points from raw chief complaints.
    Complies with strict medical AI safety constraints: no diagnosis, no prescriptions, no urgency alteration.
    """
    return await summarize_chief_complaint(payload.chief_complaint)


@router.post("/patient-assistant", response_model=PatientAssistantResponse)
async def ask_patient_assistant(payload: PatientAssistantRequest) -> PatientAssistantResponse:
    """
    Solves patient doubts with an AI assistant grounded strictly in hospital queue protocols and facility info.
    If the question involves medical advice/prescriptions or has no knowledge, it directs to related staff.
    """
    return await solve_patient_doubt(payload)

