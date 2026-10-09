from pydantic import BaseModel, Field
from typing import Dict, List


class DepartmentLoadStat(BaseModel):
    department_id: str
    department_name: str
    waiting_count: int
    in_consultation_count: int
    completed_today: int
    avg_wait_minutes: float


class HourlyArrivalStat(BaseModel):
    hour_label: str
    patient_count: int


class AnalyticsOverviewResponse(BaseModel):
    total_registered_today: int
    currently_waiting: int
    in_consultation: int
    completed_today: int
    average_wait_time_minutes: float
    urgency_distribution: Dict[str, int]
    department_load: List[DepartmentLoadStat]
    hourly_intake_trend: List[HourlyArrivalStat]
