# WAVE AI Photo Validator — Computer Vision Implementation

This document explains the complete implementation of the **AI/CV Photo Validator** module for **WAVE (Water Anomaly & Validation Engine)**. The module analyzes citizen-submitted report photos and converts them into structured signals that can be consumed by the WAVE backend and dashboard to support water pollution risk assessment.

This implementation is designed for an **MVP / hackathon prototype**, so the main goals are:

1. Detect whether the uploaded photo actually shows a water area.
2. Detect whether there is visible floating trash.
3. Detect whether the water appears visually turbid.
4. Check image quality so poor images can be flagged for review.
5. Estimate water color using lightweight image processing.
6. Produce a final JSON output that is ready for backend integration.

---

## 1. Module Objective

The AI/CV module acts as a **photo validation layer** for WAVE crowdsourced reports.

In the initial MVP, citizen photos are not only stored as visual evidence, but also processed into AI-generated signals:

```json
{
  "is_water_scene": true,
  "image_quality": "good",
  "quality_score": 0.87,
  "quality_issues": [],
  "floating_trash": true,
  "turbid_water": true,
  "turbidity_level": "turbid",
  "water_color": "brown",
  "severity_score": 0.76,
  "severity_level": "high",
  "confidence": 0.84,
  "photo_ai_score": 0.55,
  "needs_review": false
}
```

This output can be used to:

- validate whether a submitted photo is relevant to a water body,
- strengthen the water-zone risk score,
- help inspectors view more meaningful evidence in the dashboard,
- filter out non-water, blurry, too dark, or invalid photos,
- provide a foundation for a stronger CV model after the MVP stage.

---

## 2. v1 Implementation Scope

### 2.1 Deep Learning Tasks

The v1 model only trains three main tasks:

| Task | Type | Output |
|---|---:|---|
| `is_water_scene` | binary classification | `true / false` |
| `floating_trash` | binary classification | `true / false` |
| `turbid_water` | binary classification | `true / false` |

### 2.2 Fields Not Trained in v1

Several fields are not trained in v1 because the dataset is not strong enough yet or the labels are too noisy:

| Field | v1 Status | Reason |
|---|---|---|
| `trash_density` | not used | requires manual low/medium/high labels or segmentation |
| `trash_coverage` | not used | requires bounding boxes or segmentation masks |
| `water_color` | image processing | safer to compute from pixel colors |
| `turbidity_level` 5-class | heuristic | 5-level labels are not balanced enough |
| `scene_type` | removed | WAVE already has `zone_id`, GPS, OSM, and satellite context |

Final v1 decision:

```txt
floating_trash = true / false only
water_color = image processing
trash_density = removed from v1
trash_coverage = removed from v1
```

---

## 3. Datasets Used

The dataset is built by combining several Kaggle datasets available in the notebook environment.

| Dataset | Purpose | Labels Used |
|---|---|---|
| Clean Dirty Water Dataset | clean/dirty water examples | initial turbidity signal |
| Intel Image Dataset | non-water negative samples | `is_water_scene = 0` |
| River Plastic Pollution Detection | river plastic/trash samples | `floating_trash = 1` |
| Water Pollution Images for Plastic Detection | visual pollution/trash samples | `floating_trash = 1` |
| RIWA River Water Segmentation Dataset | river images + water masks | water scene + pseudo turbidity |

Kaggle dataset paths:

```python
CLEAN_DIRTY_ROOT = Path("/kaggle/input/datasets/elvinagammed/clean-dirty-water-dataset")
INTEL_ROOT = Path("/kaggle/input/datasets/rahmasleam/intel-image-dataset")
RIVER_PLASTIC_ROOT = Path("/kaggle/input/datasets/abhranta/narmada-river-plastic-pollution-detection")
WATER_POLLUTION_ROOT = Path("/kaggle/input/datasets/kabeer2004/water-pollution-images")
RIWA_ROOT = Path("/kaggle/input/datasets/franzwagner/river-water-segmentation-dataset")
```

---

## 4. Label Schema

The final dataset is stored at:

```txt
/kaggle/working/wave_cv_dataset/labels.csv
```

Main columns:

| Column | Description |
|---|---|
| `filename` | copied image filename in the working folder |
| `source_path` | original path from Kaggle input |
| `source_dataset` | source dataset name |
| `is_water_scene` | 1 = water, 0 = non-water |
| `floating_trash` | 1 = trash present, 0 = no trash, -1 = unknown |
| `turbid_water` | initial turbidity label |
| `turbidity_level` | initial clear/turbid/dirty/unknown label |
| `pseudo_turbidity_score` | pseudo-label score from RIWA water masks |
| `turbidity_label_source` | source of turbidity label |
| `turbid_water_v1` | final binary label for training |
| `turbidity_level_v1` | `clear`, `turbid`, or `unknown` |

### 4.1 Meaning of Label `-1`

The label `-1` means **unknown**, not false.

Example:

```txt
floating_trash = -1
```

This means the image is ignored for the `floating_trash` loss, but it can still be used for other tasks such as `is_water_scene`.

---

## 5. Dataset Preparation Pipeline

Dataset preparation is performed in several stages.

### 5.1 Copying and Standardizing Images

All images from the source datasets are copied into a single folder:

```txt
/kaggle/working/wave_cv_dataset/images
```

Filenames are standardized:

```txt
intel_negative_000001.jpg
riwa_000002.jpg
water_pollution_000003.jpg
river_plastic_000004.jpg
clean_dirty_000005.jpg
```

### 5.2 Labeling Rules

#### A. Intel Image Dataset

Used as non-water data.

Classes used:

```python
negative_classes = {"buildings", "forest", "glacier", "mountain", "street"}
```

The `sea` class is intentionally **excluded** because it is still a water scene.

Labels:

```txt
is_water_scene = 0
floating_trash = 0
turbid_water = 0
```

#### B. RIWA Dataset

Used as water scene data.

Mask/annotation files are not used as training images.

Initial labels:

```txt
is_water_scene = 1
floating_trash = -1
turbid_water = -1
```

#### C. River Plastic and Water Pollution

Used as positive samples for floating trash.

Labels:

```txt
is_water_scene = 1
floating_trash = 1
turbid_water = -1
```

#### D. Clean Dirty Water Dataset

Used as an additional turbidity signal.

Important fix:

Do not determine clean/dirty labels only from the full path string because the root folder is named:

```txt
clean-dirty-water-dataset
```

If the logic only checks `"clean" in path`, every path may be incorrectly treated as clean. The implementation should check specific parent folders such as `Clean-samples` and `Dirty-samples`.

---

## 6. RIWA Turbidity Pseudo-labeling

Because real turbidity labels are limited, RIWA is used for water-mask-based pseudo-labeling.

### 6.1 Principle

1. Take a RIWA image.
2. Find the corresponding water mask.
3. Resize both image and mask to `256x256`.
4. Use only pixels inside the water mask.
5. Convert RGB to HSV.
6. Calculate brown/gray/dark/green indicators.
7. Convert the score into a turbidity label.

### 6.2 Pseudo Turbidity Score Formula

```python
score = (
    0.50 * brown_ratio +
    0.25 * gray_ratio +
    0.15 * dark_ratio +
    0.10 * green_ratio
)
```

### 6.3 Score-to-Label Mapping

```python
if score <= 0.12:
    turbid_water = 0
    turbidity_level = "clear"
elif score < 0.28:
    turbid_water = -1
    turbidity_level = "unknown"
elif score < 0.50:
    turbid_water = 1
    turbidity_level = "turbid"
elif score < 0.70:
    turbid_water = 1
    turbidity_level = "very_turbid"
else:
    turbid_water = 1
    turbidity_level = "dirty"
```

The ambiguous range is intentionally labeled as `unknown` to avoid injecting noisy labels into training.

---

## 7. Binary Turbidity v1

Because the 5-class turbidity data is imbalanced, v1 only uses binary turbidity.

Final mapping:

```txt
clear       -> turbid_water_v1 = 0
turbid      -> turbid_water_v1 = 1
very_turbid -> turbid_water_v1 = 1
dirty       -> turbid_water_v1 = 1
unknown     -> turbid_water_v1 = -1
```

Final columns:

```txt
turbid_water_v1
turbidity_level_v1
```

Final distribution used:

```txt
turbidity_level_v1:
unknown = 3768
clear   = 493
turbid  = 318
```

---

## 8. Corrupt Image Cleaning

During training, corrupt images were found, for example:

```txt
water_pollution_004337.jpg
```

Therefore, image validation is added to the pipeline.

Validation is performed with:

```python
with Image.open(path) as img:
    img.verify()
```

Then the image is reopened and checked for minimum size:

```python
if width < 20 or height < 20:
    invalid
```

Invalid files are removed from the working image folder, and their rows are removed from `labels.csv`.

---

## 9. Train / Validation / Test Split

The split is created from the cleaned dataset:

```txt
train = 70%
val   = 15%
test  = 15%
```

Stratification is performed using `is_water_scene`, because it is the most complete and most important label.

Final split sizes:

```txt
Train: 3205
Val:    687
Test:   687
```

Label distributions:

```txt
TRAIN
is_water_scene: 0=1743, 1=1462
floating_trash: 0=1787, 1=274, -1=1144
turbid_water_v1: 0=352, 1=205, -1=2648

VAL
is_water_scene: 0=373, 1=314
floating_trash: 0=385, 1=61, -1=241
turbid_water_v1: 0=60, 1=55, -1=572

TEST
is_water_scene: 0=374, 1=313
floating_trash: 0=379, 1=61, -1=247
turbid_water_v1: 0=81, 1=58, -1=548
```

---

## 10. Model Architecture

The model uses the following backbone:

```txt
EfficientNet-B0 pretrained on ImageNet
```

The original classifier head is replaced with identity, and three binary heads are added.

```python
self.heads = nn.ModuleDict({
    "is_water_scene": nn.Linear(in_features, 1),
    "floating_trash": nn.Linear(in_features, 1),
    "turbid_water": nn.Linear(in_features, 1),
})
```

Each head outputs one scalar logit.

The logit is converted into probability using sigmoid:

```python
prob = torch.sigmoid(logit)
```

---

## 11. Training Configuration

Training configuration:

```python
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 8
LR = 1e-4
WEIGHT_DECAY = 1e-4
OPTIMIZER = AdamW
```

Training augmentations:

```python
transforms.Resize((224, 224))
transforms.RandomHorizontalFlip(p=0.5)
transforms.RandomRotation(degrees=8)
transforms.ColorJitter(
    brightness=0.15,
    contrast=0.15,
    saturation=0.12,
    hue=0.03
)
```

Validation/test transform:

```python
transforms.Resize((224, 224))
transforms.ToTensor()
transforms.Normalize(ImageNet mean/std)
```

---

## 12. Loss Function with Unknown-label Masking

The model uses binary cross entropy with logits.

Because some tasks have `-1` labels, loss is computed only for valid labels.

```python
def masked_bce_loss(logits, targets, pos_weight):
    mask = targets != -1

    if mask.sum() == 0:
        return logits.sum() * 0.0

    return F.binary_cross_entropy_with_logits(
        logits[mask],
        targets[mask],
        pos_weight=pos_weight
    )
```

Total loss:

```python
total_loss = loss_water + loss_trash + loss_turbid
```

### 12.1 Positive Weight

Because class imbalance is significant for `floating_trash`, `pos_weight` is used.

Final positive weights:

```txt
is_water_scene = 1.192
floating_trash = 6.522
turbid_water   = 1.717
```

---

## 13. Evaluation Metrics

The metrics used are:

- accuracy,
- precision,
- recall,
- F1 score,
- TP/TN/FP/FN.

Metrics are also computed only on valid labels, not `-1`.

---

## 14. Training Result

The best training checkpoint is saved at:

```txt
/kaggle/working/wave_cv_dataset/wave_cv_model_v1_best.pth
```

Best validation result:

```txt
Best val avg F1: 0.9732
```

Final test result:

```txt
Test loss: 0.3381
Test avg F1: 0.9571

is_water_scene
acc=0.993
precision=1.000
recall=0.984
f1=0.992
tp=308 tn=374 fp=0 fn=5

floating_trash
acc=0.995
precision=0.966
recall=1.000
f1=0.983
tp=57 tn=382 fp=2 fn=0

turbid_water
acc=0.908
precision=0.897
recall=0.897
f1=0.897
tp=52 tn=66 fp=6 fn=6
```

Interpretation:

- `is_water_scene` is very strong for the prototype.
- `floating_trash` performs very well on the test set, but dataset bias should still be considered.
- `turbid_water` is good enough as a weak visual turbidity baseline, but it is not a scientific or lab-grade measurement.

---

## 15. Threshold Tuning

The initial threshold for all tasks was `0.5`. After inspecting sample predictions, `floating_trash` was too sensitive, so threshold tuning was performed on the validation set.

Threshold tuning result:

```txt
Best water threshold  = 0.20
Best trash threshold  = 0.85
Best turbid threshold = 0.30
```

However, for final inference, `is_water_scene` is kept at `0.50` so non-water photos do not pass too easily as water scenes.

Final WAVE v1 thresholds:

```python
TASK_THRESHOLDS = {
    "is_water_scene": 0.50,
    "floating_trash": 0.85,
    "turbid_water": 0.30,
}
```

---

## 16. Inference Pipeline

The inference pipeline accepts one image and returns the final JSON output.

Processing order:

```txt
1. Load image
2. Check image quality
3. Run model inference
4. Apply task thresholds
5. Gate water-related predictions
6. Detect water color using image processing
7. Compute turbidity level heuristic
8. Compute severity score
9. Compute photo_ai_score
10. Decide needs_review
11. Return final JSON
```

---

## 17. Image Quality Checker

The image quality checker does not use ML. It uses pixel-based heuristics.

Checks performed:

| Issue | Condition |
|---|---|
| `low_resolution` | width < 640 or height < 480 |
| `too_dark` | mean brightness < 0.18 |
| `too_bright` | mean brightness > 0.88 |
| `overexposed` | very bright area > 25% |
| `blurry` | Laplacian variance < 80 |
| `blank_or_blocked` | color standard deviation is too low |

Quality score starts from `1.0`, then is reduced based on detected issues.

Mapping:

```python
if score >= 0.75:
    image_quality = "good"
elif score >= 0.50:
    image_quality = "acceptable"
else:
    image_quality = "poor"
```

---

## 18. Water Color Detection

`water_color` is not trained by the model. It is computed using image processing from the center-lower area of the image.

Reasoning:

- reliable water color labels are not available,
- a trained color model may inherit dataset bias,
- the heuristic is sufficient as an explanation signal for the MVP.

### 18.1 Crop Region

Crop used:

```python
crop = arr[
    int(h * 0.30): int(h * 0.95),
    int(w * 0.10): int(w * 0.90),
    :
]
```

This crop is selected because in many water-scene photos, the water body appears in the center-to-lower part of the image.

### 18.2 HSV Rule

The RGB image is converted into HSV, then color ratios are evaluated:

- brown,
- green,
- gray,
- dark/black.

`water_color` output:

```txt
clear
brown
dark_brown
green
gray
black
unknown
```

Each color also produces an `abnormal_color_score`.

Example:

```txt
clear      -> 0.00
brown      -> 0.55
dark_brown -> 0.80
black      -> 0.85
gray       -> 0.45
green      -> 0.55
unknown    -> 0.20
```

---

## 19. Non-water Gating

One of the most important inference rules:

```python
if not is_water_scene:
    floating_trash = False
    turbid_water = False
    turbidity_level = "unknown"
    water_color = "unknown"
    severity_score = 0.0
    photo_ai_score = 0.0
    needs_review = True
```

This prevents building, road, mountain, or other non-water photos from generating water pollution scores.

Example non-water output:

```json
{
  "is_water_scene": false,
  "floating_trash": false,
  "turbid_water": false,
  "turbidity_level": "unknown",
  "water_color": "unknown",
  "severity_score": 0.0,
  "photo_ai_score": 0.0,
  "needs_review": true
}
```

---

## 20. Turbidity Level Heuristic

The model only predicts binary `turbid_water`.

`turbidity_level` is created using a heuristic:

```python
if turbid_prob < TASK_THRESHOLDS["turbid_water"]:
    return "clear"

if turbid_prob >= 0.85 and water_color in {"dark_brown", "black", "gray"}:
    return "very_turbid"

return "turbid"
```

Notes:

- This is not a 5-class turbidity model.
- It is only a human-readable dashboard label.
- Scientific measurement still requires sensors, lab tests, or ground-truth observations.

---

## 21. Severity Score

Severity score is computed after model inference and water color detection.

If the image is not a water scene:

```python
severity_score = 0.0
```

If it is a water scene:

```python
severity_score = (
    0.50 * trash_score +
    0.40 * turbidity_score +
    0.10 * color_score
)
```

Components:

| Component | Weight | Source |
|---|---:|---|
| `trash_score` | 0.50 | model probability for `floating_trash` |
| `turbidity_score` | 0.40 | model probability for `turbid_water` |
| `color_score` | 0.10 | image processing `water_color` |

For better stability, a probability is only used if the final boolean task is true:

```python
trash_score = probs["floating_trash"] if floating_trash else 0.0
turbidity_score = probs["turbid_water"] if turbid_water else 0.0
```

---

## 22. Severity Level

Score-to-level mapping:

```python
if score <= 0.25:
    severity_level = "low"
elif score <= 0.50:
    severity_level = "moderate"
elif score <= 0.75:
    severity_level = "high"
else:
    severity_level = "critical"
```

---

## 23. Confidence Score

Confidence is computed as the average confidence of the three model tasks.

For each task:

- if the prediction is true, confidence = probability,
- if the prediction is false, confidence = `1 - probability`.

```python
task_confidences = [
    probs["is_water_scene"] if is_water_scene else 1.0 - probs["is_water_scene"],
    probs["floating_trash"] if raw_floating_trash else 1.0 - probs["floating_trash"],
    probs["turbid_water"] if raw_turbid_water else 1.0 - probs["turbid_water"],
]

confidence = mean(task_confidences)
```

Confidence uses the raw model decisions so it is not misleading after non-water gating.

---

## 24. Photo AI Score

`photo_ai_score` is the final score representing how strongly the photo contributes to the pollution-risk signal.

Formula:

```python
photo_ai_score = severity_score * confidence * quality_score
```

Meaning:

- `severity_score`: how severe the visual pollution indication is,
- `confidence`: how confident the model is,
- `quality_score`: how usable the image is.

For non-water photos:

```txt
severity_score = 0
photo_ai_score = 0
```

This is intentional so irrelevant photos do not increase the WAVE risk score.

---

## 25. Needs Review Logic

A photo is flagged for review if:

```python
needs_review = (
    not is_water_scene
    or quality_score < 0.50
    or confidence < 0.60
)
```

A photo goes to review if:

- it is not a water photo,
- the image quality is poor,
- the model confidence is low.

---

## 26. Final JSON Output

Final inference output:

```json
{
  "is_water_scene": true,
  "image_quality": "good",
  "quality_score": 1.0,
  "quality_issues": [],
  "floating_trash": false,
  "turbid_water": true,
  "turbidity_level": "turbid",
  "water_color": "brown",
  "severity_score": 0.384,
  "severity_level": "moderate",
  "confidence": 0.93,
  "photo_ai_score": 0.357,
  "needs_review": false
}
```

Debug mode is also available:

```python
predict_photo_ai(image_path, include_debug=True)
```

Debug output adds:

```json
{
  "debug": {
    "model_probs": {},
    "raw_predictions": {},
    "final_predictions_after_gate": {},
    "thresholds": {},
    "quality_debug": {},
    "color_debug": {}
  }
}
```

---

## 27. Saved Artifacts

The pipeline produces the following artifacts:

| File | Purpose |
|---|---|
| `labels.csv` | final dataset labels |
| `splits/train.csv` | training split |
| `splits/val.csv` | validation split |
| `splits/test.csv` | test split |
| `wave_cv_model_v1_best.pth` | best model checkpoint |
| `wave_cv_model_v1_state_dict.pth` | pure model state dict |
| `photo_ai_config_v1.json` | thresholds and formula config |
| `photo_ai_sample_predictions_v1.json` | sample prediction results |

---

## 28. Config JSON

The final config is saved as:

```txt
/kaggle/working/wave_cv_dataset/photo_ai_config_v1.json
```

Config content:

```json
{
  "model_name": "wave_cv_model_v1",
  "backbone": "efficientnet_b0",
  "image_size": 224,
  "tasks": [
    "is_water_scene",
    "floating_trash",
    "turbid_water"
  ],
  "thresholds": {
    "is_water_scene": 0.5,
    "floating_trash": 0.85,
    "turbid_water": 0.3
  },
  "severity_formula": {
    "trash_weight": 0.5,
    "turbidity_weight": 0.4,
    "water_color_weight": 0.1
  },
  "photo_ai_score_formula": "severity_score * confidence * quality_score",
  "notes": [
    "floating_trash is binary only",
    "water_color is derived using image processing",
    "turbidity_level is heuristic from binary turbidity probability",
    "non-water images are gated to severity_score=0 and photo_ai_score=0"
  ]
}
```

---

## 29. Backend Integration Plan

In the WAVE backend, this module can be exposed as a service/API.

### 29.1 Suggested Endpoint

```http
POST /api/photo-ai/analyze
Content-Type: multipart/form-data
```

Request:

```txt
photo: image file
report_id: optional
zone_id: optional
lat: optional
lng: optional
```

Response:

```json
{
  "report_id": "report_123",
  "zone_id": "zone_abc",
  "photo_ai": {
    "is_water_scene": true,
    "image_quality": "good",
    "quality_score": 0.91,
    "quality_issues": [],
    "floating_trash": true,
    "turbid_water": true,
    "turbidity_level": "turbid",
    "water_color": "brown",
    "severity_score": 0.71,
    "severity_level": "high",
    "confidence": 0.88,
    "photo_ai_score": 0.57,
    "needs_review": false
  }
}
```

### 29.2 Database Fields

Suggested columns for a photo/report evidence table:

```sql
photo_ai_is_water_scene BOOLEAN
photo_ai_image_quality TEXT
photo_ai_quality_score FLOAT
photo_ai_quality_issues JSONB
photo_ai_floating_trash BOOLEAN
photo_ai_turbid_water BOOLEAN
photo_ai_turbidity_level TEXT
photo_ai_water_color TEXT
photo_ai_severity_score FLOAT
photo_ai_severity_level TEXT
photo_ai_confidence FLOAT
photo_ai_score FLOAT
photo_ai_needs_review BOOLEAN
photo_ai_debug JSONB -- optional, only for internal/dev
```

---

## 30. Integration with WAVE Risk Score

`photo_ai_score` can become one component of WAVE risk scoring.

Example MVP formula:

```txt
risk_score =
    0.40 * satellite_anomaly_score +
    0.25 * osm_risk_score +
    0.25 * photo_ai_score +
    0.10 * crowd_report_score
```

Alternatively, if following the initial PRD formula that already includes `crowdsource_count`, the Photo AI module can replace or improve the crowdsourcing component:

```txt
photo_signal = normalize(crowdsource_count) * average(photo_ai_score)
```

This way, citizen reports are not only counted by volume, but also weighted by image quality and visual pollution evidence.

---

## 31. Known Limitations

The v1 implementation is sufficient for MVP, but it is not production-grade.

Main limitations:

1. The dataset comes from multiple sources, which creates dataset-bias risk.
2. `floating_trash` may learn shortcuts from dataset source instead of only trash objects.
3. `turbid_water` uses pseudo-labels, not scientific ground truth.
4. `water_color` uses a crop heuristic, not a segmentation model.
5. Real citizen photos will likely be noisier than Kaggle dataset photos.
6. There is no trash localization or segmentation yet.
7. Model probabilities are not calibrated yet.
8. Geographic consistency checking is not included inside the CV module.

---

## 32. Recommended Next Improvements

If the project continues after the MVP, recommended improvements include:

### 32.1 Data Improvement

- Add real citizen photos from Vietnam.
- Manually label RIWA as water no-trash hard negatives.
- Add `floating_trash=0` labels for water scenes without trash.
- Build a validation dataset that does not share source distributions with training.
- Add manual labels for 3-level turbidity: `clear`, `turbid`, `dirty`.

### 32.2 Model Improvement

- Add a segmentation model for water regions.
- Add object detection/segmentation for trash.
- Use calibrated probabilities.
- Try MobileNetV3 for lighter deployment.
- Export the model to ONNX for backend inference.

### 32.3 System Improvement

- Add GPS-zone validation.
- Add duplicate image detection.
- Add EXIF timestamp validation.
- Add an asynchronous inference queue.
- Store debug output only in the development environment.

---

## 33. Final Status

WAVE AI/CV v1 implementation status:

```txt
Dataset preparation       DONE
Image cleaning            DONE
Train/val/test split      DONE
3-head CV model training  DONE
Model evaluation          DONE
Threshold tuning          DONE
Image quality checker     DONE
Water color processing    DONE
Photo AI JSON output      DONE
Config artifact           DONE
Sample prediction export  DONE
```

Conclusion:

```txt
AI/CV Photo Validator v1 is ready for the WAVE MVP / hackathon prototype.
```

This module is not claimed as a production-grade environmental monitoring model, but it is strong enough to demonstrate the WAVE workflow:

```txt
Citizen photo -> AI validation -> photo_ai_score -> zone risk scoring -> dashboard insight
```
