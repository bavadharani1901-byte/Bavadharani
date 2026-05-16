from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlparse

import numpy as np
import requests
from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

REPO_ROOT = Path(__file__).resolve().parents[2]
WATER_CV_DIR = REPO_ROOT / "ai" / "water-cv"
DEFAULT_MODEL_PATH = WATER_CV_DIR / "wave_cv_model_v1_best.pth"
DEFAULT_CONFIG_PATH = WATER_CV_DIR / "photo_ai_config_v1.json"

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

_MODEL: Optional[Any] = None
_DEVICE: Optional[str] = None
_CONFIG: Optional[Dict[str, Any]] = None


class PhotoAIError(RuntimeError):
    pass


def load_config(config_path: Path = DEFAULT_CONFIG_PATH) -> Dict[str, Any]:
    global _CONFIG
    if _CONFIG is not None:
        return _CONFIG

    if config_path.exists():
        _CONFIG = json.loads(config_path.read_text())
    else:
        _CONFIG = {
            "model_name": "wave_cv_model_v1",
            "backbone": "efficientnet_b0",
            "image_size": 224,
            "tasks": ["is_water_scene", "floating_trash", "turbid_water"],
            "thresholds": {
                "is_water_scene": 0.5,
                "floating_trash": 0.85,
                "turbid_water": 0.3,
            },
            "severity_formula": {
                "trash_weight": 0.5,
                "turbidity_weight": 0.4,
                "water_color_weight": 0.1,
            },
        }
    return _CONFIG


def laplacian_variance(gray: np.ndarray) -> float:
    gray = gray.astype(np.float32)
    if gray.shape[0] < 3 or gray.shape[1] < 3:
        return 0.0

    center = gray[1:-1, 1:-1] * 4
    up = gray[:-2, 1:-1]
    down = gray[2:, 1:-1]
    left = gray[1:-1, :-2]
    right = gray[1:-1, 2:]
    lap = center - up - down - left - right
    return float(lap.var())


def check_image_quality(image_path: str | Path) -> Dict[str, Any]:
    try:
        img = Image.open(image_path).convert("RGB")
    except Exception as exc:
        raise PhotoAIError(f"Invalid image: {exc}") from exc

    w, h = img.size
    analysis_img = img.copy()
    analysis_img.thumbnail((512, 512))

    arr = np.asarray(analysis_img).astype(np.float32) / 255.0
    gray = np.dot(arr[..., :3], [0.299, 0.587, 0.114])

    issues = []
    score = 1.0

    if w < 640 or h < 480:
        issues.append("low_resolution")
        score -= 0.25

    mean_brightness = float(gray.mean())
    if mean_brightness < 0.18:
        issues.append("too_dark")
        score -= 0.25
    if mean_brightness > 0.88:
        issues.append("too_bright")
        score -= 0.25

    overexposed_ratio = float((gray > 0.95).mean())
    if overexposed_ratio > 0.25:
        issues.append("overexposed")
        score -= 0.20

    blur_score = laplacian_variance(gray * 255.0)
    if blur_score < 80:
        issues.append("blurry")
        score -= 0.30

    color_std = float(arr.std())
    if color_std < 0.035:
        issues.append("blank_or_blocked")
        score -= 0.50

    score = max(0.0, min(1.0, score))
    if score >= 0.75:
        quality = "good"
    elif score >= 0.50:
        quality = "acceptable"
    else:
        quality = "poor"

    return {
        "image_quality": quality,
        "quality_score": round(score, 3),
        "quality_issues": issues,
        "debug": {
            "width": w,
            "height": h,
            "mean_brightness": round(mean_brightness, 3),
            "blur_score": round(blur_score, 2),
            "overexposed_ratio": round(overexposed_ratio, 3),
            "color_std": round(color_std, 3),
        },
    }


def detect_water_color(image_path: str | Path) -> Dict[str, Any]:
    img = Image.open(image_path).convert("RGB").resize((256, 256))
    arr = np.asarray(img).astype(np.float32) / 255.0
    h, w, _ = arr.shape

    crop = arr[int(h * 0.30): int(h * 0.95), int(w * 0.10): int(w * 0.90), :]
    hsv = rgb_to_hsv(crop)
    hue = hsv[..., 0]
    sat = hsv[..., 1]
    val = hsv[..., 2]

    mean_v = float(val.mean())
    mean_s = float(sat.mean())

    brown_mask = (hue >= 0.04) & (hue <= 0.16) & (sat >= 0.18) & (val >= 0.15)
    green_mask = (hue >= 0.20) & (hue <= 0.45) & (sat >= 0.22) & (val <= 0.78)
    gray_mask = (sat <= 0.18) & (val >= 0.18) & (val <= 0.75)
    dark_mask = val <= 0.28

    brown_ratio = float(brown_mask.mean())
    green_ratio = float(green_mask.mean())
    gray_ratio = float(gray_mask.mean())
    dark_ratio = float(dark_mask.mean())

    if dark_ratio > 0.55:
        color = "black"
        abnormal_score = 0.85
    elif brown_ratio > 0.35 and mean_v < 0.45:
        color = "dark_brown"
        abnormal_score = 0.80
    elif brown_ratio > 0.25:
        color = "brown"
        abnormal_score = 0.55
    elif green_ratio > 0.25:
        color = "green"
        abnormal_score = 0.55
    elif gray_ratio > 0.45:
        color = "gray"
        abnormal_score = 0.45
    elif mean_v > 0.60 and mean_s < 0.20:
        color = "clear"
        abnormal_score = 0.0
    else:
        color = "unknown"
        abnormal_score = 0.20

    return {
        "water_color": color,
        "abnormal_color_score": float(abnormal_score),
        "debug": {
            "brown_ratio": round(brown_ratio, 3),
            "green_ratio": round(green_ratio, 3),
            "gray_ratio": round(gray_ratio, 3),
            "dark_ratio": round(dark_ratio, 3),
            "mean_v": round(mean_v, 3),
            "mean_s": round(mean_s, 3),
        },
    }


def rgb_to_hsv(rgb: np.ndarray) -> np.ndarray:
    rgb = np.asarray(rgb, dtype=np.float32)
    r = rgb[..., 0]
    g = rgb[..., 1]
    b = rgb[..., 2]

    maxc = np.max(rgb, axis=-1)
    minc = np.min(rgb, axis=-1)
    delta = maxc - minc

    hue = np.zeros_like(maxc)
    nonzero = delta != 0

    red_max = (maxc == r) & nonzero
    green_max = (maxc == g) & nonzero
    blue_max = (maxc == b) & nonzero

    hue[red_max] = ((g[red_max] - b[red_max]) / delta[red_max]) % 6
    hue[green_max] = ((b[green_max] - r[green_max]) / delta[green_max]) + 2
    hue[blue_max] = ((r[blue_max] - g[blue_max]) / delta[blue_max]) + 4
    hue = hue / 6.0

    sat = np.zeros_like(maxc)
    max_nonzero = maxc != 0
    sat[max_nonzero] = delta[max_nonzero] / maxc[max_nonzero]

    return np.stack([hue, sat, maxc], axis=-1)


def severity_level_from_score(score: float) -> str:
    if score <= 0.25:
        return "low"
    if score <= 0.50:
        return "moderate"
    if score <= 0.75:
        return "high"
    return "critical"


def turbidity_level_from_prob(turbid_prob: float, water_color: str, threshold: float) -> str:
    if turbid_prob < threshold:
        return "clear"
    if turbid_prob >= 0.85 and water_color in {"dark_brown", "black", "gray"}:
        return "very_turbid"
    return "turbid"


def build_photo_ai_result(
    probabilities: Dict[str, float],
    quality_result: Dict[str, Any],
    color_result: Dict[str, Any],
    thresholds: Dict[str, float],
    include_debug: bool = False,
) -> Dict[str, Any]:
    is_water_scene = probabilities["is_water_scene"] >= thresholds["is_water_scene"]
    raw_floating_trash = probabilities["floating_trash"] >= thresholds["floating_trash"]
    raw_turbid_water = probabilities["turbid_water"] >= thresholds["turbid_water"]

    if is_water_scene:
        floating_trash = raw_floating_trash
        turbid_water = raw_turbid_water
        water_color = color_result["water_color"]
        turbidity_level = turbidity_level_from_prob(
            probabilities["turbid_water"],
            water_color,
            thresholds["turbid_water"],
        )
    else:
        floating_trash = False
        turbid_water = False
        water_color = "unknown"
        turbidity_level = "unknown"

    task_confidences = [
        probabilities["is_water_scene"] if is_water_scene else 1.0 - probabilities["is_water_scene"],
        probabilities["floating_trash"] if raw_floating_trash else 1.0 - probabilities["floating_trash"],
        probabilities["turbid_water"] if raw_turbid_water else 1.0 - probabilities["turbid_water"],
    ]
    confidence = float(np.mean(task_confidences))

    if not is_water_scene:
        severity_score = 0.0
    else:
        trash_score = probabilities["floating_trash"] if floating_trash else 0.0
        turbidity_score = probabilities["turbid_water"] if turbid_water else 0.0
        color_score = color_result["abnormal_color_score"]
        severity_score = 0.50 * trash_score + 0.40 * turbidity_score + 0.10 * color_score

    severity_score = float(max(0.0, min(1.0, severity_score)))
    quality_score = float(quality_result["quality_score"])
    photo_ai_score = severity_score * confidence * quality_score
    needs_review = not is_water_scene or quality_score < 0.50 or confidence < 0.60

    result = {
        "is_water_scene": bool(is_water_scene),
        "image_quality": quality_result["image_quality"],
        "quality_score": round(quality_score, 3),
        "quality_issues": quality_result["quality_issues"],
        "floating_trash": bool(floating_trash),
        "turbid_water": bool(turbid_water),
        "turbidity_level": turbidity_level,
        "water_color": water_color,
        "severity_score": round(float(severity_score), 3),
        "severity_level": severity_level_from_score(severity_score),
        "confidence": round(float(confidence), 3),
        "photo_ai_score": round(float(photo_ai_score), 3),
        "needs_review": bool(needs_review),
        "source": "wave_cv_model_v1",
    }

    if include_debug:
        result["debug"] = {
            "model_probs": {k: round(v, 3) for k, v in probabilities.items()},
            "raw_predictions": {
                "is_water_scene": bool(is_water_scene),
                "floating_trash": bool(raw_floating_trash),
                "turbid_water": bool(raw_turbid_water),
            },
            "final_predictions_after_gate": {
                "is_water_scene": bool(is_water_scene),
                "floating_trash": bool(floating_trash),
                "turbid_water": bool(turbid_water),
            },
            "thresholds": thresholds,
            "quality_debug": quality_result.get("debug", {}),
            "color_debug": color_result.get("debug", {}),
        }

    return result


def _load_torch_model(model_path: Path = DEFAULT_MODEL_PATH):
    global _MODEL, _DEVICE
    if _MODEL is not None:
        return _MODEL, _DEVICE

    try:
        import torch
        import torch.nn as nn
        from torchvision import models
    except Exception as exc:
        raise PhotoAIError(
            "PyTorch dependencies are missing. Install ai/photo_ai/requirements.txt."
        ) from exc

    class WaveCVModel(nn.Module):
        def __init__(self):
            super().__init__()
            backbone = models.efficientnet_b0(weights=None)
            in_features = backbone.classifier[1].in_features
            backbone.classifier = nn.Identity()
            self.backbone = backbone
            self.heads = nn.ModuleDict({
                "is_water_scene": nn.Linear(in_features, 1),
                "floating_trash": nn.Linear(in_features, 1),
                "turbid_water": nn.Linear(in_features, 1),
            })

        def forward(self, x):
            feats = self.backbone(x)
            return {name: head(feats).squeeze(1) for name, head in self.heads.items()}

    if not model_path.exists():
        raise PhotoAIError(f"Model checkpoint not found: {model_path}")

    _DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    model = WaveCVModel().to(_DEVICE)
    checkpoint = torch.load(model_path, map_location=_DEVICE, weights_only=False)
    state_dict = checkpoint.get("model_state_dict", checkpoint)
    model.load_state_dict(state_dict)
    model.eval()
    _MODEL = model
    return _MODEL, _DEVICE


def _preprocess_image(image_path: str | Path):
    try:
        import torch
    except Exception as exc:
        raise PhotoAIError(
            "PyTorch dependencies are missing. Install ai/photo_ai/requirements.txt."
        ) from exc

    config = load_config()
    size = int(config.get("image_size", 224))
    img = Image.open(image_path).convert("RGB").resize((size, size))
    arr = np.asarray(img).astype(np.float32) / 255.0
    arr = (arr - np.asarray(IMAGENET_MEAN, dtype=np.float32)) / np.asarray(
        IMAGENET_STD,
        dtype=np.float32,
    )
    arr = np.transpose(arr, (2, 0, 1))
    return torch.from_numpy(arr).unsqueeze(0)


def predict_local_image(image_path: str | Path, include_debug: bool = False) -> Dict[str, Any]:
    try:
        import torch
    except Exception as exc:
        raise PhotoAIError(
            "PyTorch dependencies are missing. Install ai/photo_ai/requirements.txt."
        ) from exc

    config = load_config()
    thresholds = config["thresholds"]
    quality_result = check_image_quality(image_path)
    color_result = detect_water_color(image_path)

    model, device = _load_torch_model()
    x = _preprocess_image(image_path).to(device)

    with torch.no_grad():
        outputs = model(x)
        probabilities = {
            task: float(torch.sigmoid(logit).cpu().item())
            for task, logit in outputs.items()
        }

    return build_photo_ai_result(
        probabilities=probabilities,
        quality_result=quality_result,
        color_result=color_result,
        thresholds=thresholds,
        include_debug=include_debug,
    )


def download_image_to_temp(image_url: str) -> Path:
    parsed = urlparse(image_url)
    if parsed.scheme not in {"http", "https"}:
        raise PhotoAIError("image_url must be an http(s) URL")

    response = requests.get(image_url, timeout=15)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "")
    if content_type and not content_type.startswith("image/"):
        raise PhotoAIError(f"URL did not return an image content-type: {content_type}")

    suffix = Path(parsed.path).suffix or ".jpg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(response.content)
        return Path(tmp.name)
    finally:
        tmp.close()


def predict_image_url(image_url: str, include_debug: bool = False) -> Dict[str, Any]:
    tmp_path = download_image_to_temp(image_url)
    try:
        return predict_local_image(tmp_path, include_debug=include_debug)
    finally:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass
