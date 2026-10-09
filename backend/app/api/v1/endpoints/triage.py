from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.schemas.triage import VitalObservations, TriageAssessmentResponse, UrgencyCategoryType
from app.schemas.queue import TriageOverrideRequest
from app.services.triage_engine import evaluate_triage
from app.services.storage import store

router = APIRouter()


class EvaluateTriageRequest(BaseModel):
    vital_observations: VitalObservations
    chief_complaint: Optional[str] = ""
    age: Optional[int] = 30


class EvaluateTriageResponse(BaseModel):
    urgency_category: UrgencyCategoryType
    urgency_score: int
    rule_evidence: list[str]
    missing_vital_flags: list[str]


@router.post("/evaluate", response_model=EvaluateTriageResponse, tags=["Triage Rules Engine"])
async def dry_run_triage_evaluation(req: EvaluateTriageRequest):
    """
    Dry-run preliminary triage calculation without persisting.
    """
    res = evaluate_triage(
        vitals=req.vital_observations,
        chief_complaint=req.chief_complaint or "",
        age=req.age or 30,
    )
    return EvaluateTriageResponse(
        urgency_category=res.urgency_category,
        urgency_score=res.urgency_score,
        rule_evidence=res.rule_evidence,
        missing_vital_flags=res.missing_vital_flags,
    )


@router.post("/{visit_id}/override", response_model=TriageAssessmentResponse, tags=["Triage Rules Engine"])
async def override_patient_triage(visit_id: str, req: TriageOverrideRequest):
    """
    Clinician manual override of automated triage urgency with mandatory rationale logged to audit history.
    """
    res = store.override_triage_urgency(
        visit_id=visit_id,
        new_category=req.override_category,
        reason=req.override_reason,
    )
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Triage assessment for visit ID '{visit_id}' not found.",
        )
    return res
