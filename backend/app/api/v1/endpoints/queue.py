from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional
from app.schemas.queue import (
    QueueEntryResponse,
    CallNextRequest,
    CallNextResponse,
    StatusUpdateRequest,
)
from app.schemas.visit import VisitResponse
from app.services.storage import store
from app.services.sms_service import sms_service

router = APIRouter()


@router.get("", response_model=List[QueueEntryResponse], tags=["Dynamic Queue"])
async def get_patient_queue(
    department_id: Optional[str] = Query(None, description="Filter by department ID"),
    status: Optional[str] = Query("WAITING", description="Filter by visit status or 'ALL'"),
):
    """
    Retrieve server-prioritized clinical queue sorted by composite priority rank (urgency score + wait time).
    """
    return store.get_queue(department_id=department_id, status=status)


@router.post("/call-next", response_model=CallNextResponse, tags=["Dynamic Queue"])
async def call_next_patient(req: CallNextRequest):
    """
    Atomically calls the highest priority waiting patient in the specified department.
    """
    room_name = req.room_or_desk or "Consultation Room 1"
    called_entry = store.call_next(
        department_id=req.department_id, room_or_desk=room_name
    )
    if not called_entry:
        return CallNextResponse(
            success=False,
            data=None,
            message="No waiting patients currently in this department.",
        )

    # Dispatch Call SMS to patient
    sms_service.send_call_sms(
        patient_name=called_entry.full_name,
        phone_number=None,
        uhid=called_entry.uhid,
        department_name=called_entry.department_name,
        room_name=room_name,
    )

    return CallNextResponse(
        success=True,
        data=called_entry,
        message=f"Patient {called_entry.full_name} ({called_entry.uhid}) called to {room_name}.",
    )
