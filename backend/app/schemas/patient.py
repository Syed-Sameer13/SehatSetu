from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal
from datetime import datetime


GenderType = Literal["MALE", "FEMALE", "OTHER"]


class PatientBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150, description="Patient full legal name")
    age: int = Field(..., ge=0, le=130, description="Patient age in years")
    gender: GenderType = Field(..., description="Patient biological gender")
    phone_number: Optional[str] = Field(None, max_length=20, description="Contact phone number")
    emergency_contact_phone: Optional[str] = Field(None, max_length=20, description="Emergency contact phone")
    address: Optional[str] = Field(None, description="Residential address")


class PatientCreate(PatientBase):
    uhid: Optional[str] = Field(None, description="Optional existing UHID; auto-generated if omitted")


class PatientResponse(PatientBase):
    id: str
    uhid: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
