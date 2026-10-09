from fastapi import APIRouter
from typing import List
from app.schemas.department import DepartmentResponse
from app.services.storage import store

router = APIRouter()


@router.get("", response_model=List[DepartmentResponse], tags=["Departments"])
async def list_departments():
    """
    List all active clinical departments in the hospital.
    """
    return store.get_departments()
