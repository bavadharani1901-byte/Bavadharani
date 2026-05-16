from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class AnalyzePhotoRequest(BaseModel):
    image_url: str = Field(..., description="HTTP(S) URL of the citizen report image")
    include_debug: bool = False


class AnalyzePhotoResponse(BaseModel):
    is_water_scene: bool
    image_quality: Literal["good", "acceptable", "poor"]
    quality_score: float
    quality_issues: List[str]
    floating_trash: bool
    turbid_water: bool
    turbidity_level: str
    water_color: str
    severity_score: float
    severity_level: Literal["low", "moderate", "high", "critical"]
    confidence: float
    photo_ai_score: float
    needs_review: bool
    source: str = "wave_cv_model_v1"
    debug: Optional[Dict[str, Any]] = None
