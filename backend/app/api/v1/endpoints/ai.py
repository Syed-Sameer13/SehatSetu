from fastapi import APIRouter
from app.schemas.ai import AISummarizeRequest, AISummarizeResponse
from app.services.ai_service import summarize_chief_complaint

router = APIRouter()


@router.post("/summarize-symptoms", response_model=AISummarizeResponse)
async def summarize_symptoms(payload: AISummarizeRequest) -> AISummarizeResponse:
    """
    Extracts concise, structured clinical bullet points from raw chief complaints.
    Complies with strict medical AI safety constraints: no diagnosis, no prescriptions, no urgency alteration.
    """
    return await summarize_chief_complaint(payload.chief_complaint)
