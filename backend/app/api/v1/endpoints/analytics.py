from fastapi import APIRouter
from app.schemas.analytics import AnalyticsOverviewResponse
from app.services.storage import store

router = APIRouter()


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview() -> AnalyticsOverviewResponse:
    """Returns real-time clinical operations metrics, queue load, and department breakdowns."""
    return store.get_analytics_overview()
