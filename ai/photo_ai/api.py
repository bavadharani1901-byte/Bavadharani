from fastapi import FastAPI, HTTPException

try:
    from .model_runner import PhotoAIError, load_config, predict_image_url
    from .schemas import AnalyzePhotoRequest, AnalyzePhotoResponse
except ImportError:
    from model_runner import PhotoAIError, load_config, predict_image_url
    from schemas import AnalyzePhotoRequest, AnalyzePhotoResponse


app = FastAPI(
    title="WAVE Photo AI Service",
    version="1.0.0",
    description="FastAPI inference service for WAVE citizen photo validation.",
)


@app.get("/health")
def health():
    config = load_config()
    return {
        "status": "ok",
        "model": config.get("model_name", "wave_cv_model_v1"),
        "tasks": config.get("tasks", []),
        "thresholds": config.get("thresholds", {}),
    }


@app.post("/analyze", response_model=AnalyzePhotoResponse)
def analyze_photo(payload: AnalyzePhotoRequest):
    try:
        return predict_image_url(
            payload.image_url,
            include_debug=payload.include_debug,
        )
    except PhotoAIError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Photo AI inference failed: {exc}") from exc
