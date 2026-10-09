from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class DepartmentBase(BaseModel):
    code: str = Field(..., description="Unique department code, e.g. EMERGENCY")
    name: str = Field(..., description="Full department name")
    description: Optional[str] = Field(None, description="Department description")
    is_active: bool = Field(True, description="Active status")


class DepartmentResponse(DepartmentBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
