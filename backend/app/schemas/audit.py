from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime


class AuditLogResponse(BaseModel):
    id: str
    visit_id: Optional[str] = None
    patient_name: Optional[str] = None
    uhid: Optional[str] = None
    department_name: Optional[str] = None
    action_type: str
    summary: Optional[str] = None
    previous_state: Optional[Dict[str, Any]] = None
    new_state: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
