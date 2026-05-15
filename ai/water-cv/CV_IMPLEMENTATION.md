# CV_IMPLEMENTATION.md

# WAVE AI Photo Validator — Computer Vision Implementation

Dokumen ini menjelaskan implementasi lengkap modul **AI/CV Photo Validator** pada proyek **WAVE (Water Anomaly & Validation Engine)**. Modul ini digunakan untuk menganalisis foto laporan warga dan mengubahnya menjadi sinyal terstruktur yang bisa dipakai oleh backend/dashboard WAVE untuk mendukung penilaian risiko pencemaran air.

Implementasi ini dibuat untuk kebutuhan **MVP / hackathon prototype**, sehingga fokus utamanya adalah:

1. Mendeteksi apakah foto benar-benar menampilkan area air.
2. Mendeteksi apakah ada indikasi sampah mengambang.
3. Mendeteksi apakah air terlihat keruh/turbid secara visual.
4. Mengecek kualitas gambar agar foto yang buruk bisa ditandai untuk review.
5. Menentukan warna air dengan image processing sederhana.
6. Menghasilkan JSON final yang siap dikonsumsi backend.

---

## 1. Tujuan Modul

Modul AI/CV ini bertugas sebagai **photo validation layer** untuk laporan crowdsourcing WAVE.

Pada MVP awal, foto warga tidak hanya disimpan sebagai bukti visual, tetapi juga diproses menjadi sinyal AI:

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

Output tersebut bisa digunakan untuk:

- memvalidasi apakah foto laporan relevan dengan air,
- memperkuat risk score zona air,
- membantu dashboard inspector menampilkan evidence yang lebih bermakna,
- memfilter foto non-water, blur, terlalu gelap, atau tidak valid,
- menjadi dasar pengembangan model CV yang lebih kuat setelah MVP.

---

## 2. Scope Implementasi v1

### 2.1 Yang Dilatih dengan Deep Learning

Model v1 hanya melatih tiga task utama:

| Task | Tipe | Output |
|---|---:|---|
| `is_water_scene` | binary classification | `true / false` |
| `floating_trash` | binary classification | `true / false` |
| `turbid_water` | binary classification | `true / false` |

### 2.2 Yang Tidak Dilatih di v1

Beberapa field tidak dilatih karena dataset belum cukup kuat atau label terlalu noisy:

| Field | Status v1 | Alasan |
|---|---|---|
| `trash_density` | tidak dipakai | butuh label manual low/medium/high atau segmentation |
| `trash_coverage` | tidak dipakai | butuh bounding box/segmentation |
| `water_color` | image processing | lebih aman dihitung dari warna piksel |
| `turbidity_level` 5-class | heuristic | label 5-level belum cukup seimbang |
| `scene_type` | dihapus | WAVE sudah punya `zone_id`, GPS, OSM, dan satellite context |

Keputusan final v1:

```txt
floating_trash = true / false only
water_color = image processing
trash_density = removed from v1
trash_coverage = removed from v1
```

---

## 3. Dataset yang Digunakan

Dataset digabung dari beberapa sumber Kaggle yang tersedia di environment notebook.

| Dataset | Fungsi | Label yang Diambil |
|---|---|---|
| Clean Dirty Water Dataset | contoh air bersih/kotor | turbidity awal |
| Intel Image Dataset | negative non-water | `is_water_scene = 0` |
| River Plastic Pollution Detection | sampah/plastik di sungai | `floating_trash = 1` |
| Water Pollution Images for Plastic Detection | sampah/polusi visual | `floating_trash = 1` |
| RIWA River Water Segmentation Dataset | gambar sungai + mask air | water scene + pseudo turbidity |

Path dataset di Kaggle:

```python
CLEAN_DIRTY_ROOT = Path("/kaggle/input/datasets/elvinagammed/clean-dirty-water-dataset")
INTEL_ROOT = Path("/kaggle/input/datasets/rahmasleam/intel-image-dataset")
RIVER_PLASTIC_ROOT = Path("/kaggle/input/datasets/abhranta/narmada-river-plastic-pollution-detection")
WATER_POLLUTION_ROOT = Path("/kaggle/input/datasets/kabeer2004/water-pollution-images")
RIWA_ROOT = Path("/kaggle/input/datasets/franzwagner/river-water-segmentation-dataset")
```

---

## 4. Label Schema

Dataset final disimpan di:

```txt
/kaggle/working/wave_cv_dataset/labels.csv
```

Kolom utama:

| Kolom | Deskripsi |
|---|---|
| `filename` | nama file hasil copy ke folder working |
| `source_path` | path asli dari Kaggle input |
| `source_dataset` | asal dataset |
| `is_water_scene` | 1 = water, 0 = non-water |
| `floating_trash` | 1 = ada trash, 0 = tidak ada trash, -1 = unknown |
| `turbid_water` | label awal turbidity |
| `turbidity_level` | label awal clear/turbid/dirty/unknown |
| `pseudo_turbidity_score` | skor pseudo-label dari RIWA water mask |
| `turbidity_label_source` | sumber label turbidity |
| `turbid_water_v1` | binary final untuk training |
| `turbidity_level_v1` | `clear`, `turbid`, atau `unknown` |

### 4.1 Arti Label `-1`

Label `-1` berarti **unknown**, bukan false.

Contoh:

```txt
floating_trash = -1
```

Artinya gambar tersebut tidak digunakan untuk menghitung loss task `floating_trash`, tetapi masih bisa dipakai untuk task lain seperti `is_water_scene`.

---

## 5. Dataset Preparation Pipeline

Pipeline dataset dilakukan dalam beberapa tahap.

### 5.1 Copy dan Standardisasi Gambar

Semua gambar dari dataset sumber dicopy ke satu folder:

```txt
/kaggle/working/wave_cv_dataset/images
```

Nama file dibuat konsisten:

```txt
intel_negative_000001.jpg
riwa_000002.jpg
water_pollution_000003.jpg
river_plastic_000004.jpg
clean_dirty_000005.jpg
```

### 5.2 Labeling Rules

#### A. Intel Image Dataset

Dipakai sebagai data non-water.

Class yang digunakan:

```python
negative_classes = {"buildings", "forest", "glacier", "mountain", "street"}
```

Class `sea` sengaja **tidak dipakai** karena tetap termasuk water scene.

Label:

```txt
is_water_scene = 0
floating_trash = 0
turbid_water = 0
```

#### B. RIWA Dataset

Dipakai sebagai data water scene.

Mask/annotation file tidak dimasukkan sebagai training image.

Label awal:

```txt
is_water_scene = 1
floating_trash = -1
turbid_water = -1
```

#### C. River Plastic dan Water Pollution

Dipakai sebagai positive sample untuk floating trash.

Label:

```txt
is_water_scene = 1
floating_trash = 1
turbid_water = -1
```

#### D. Clean Dirty Water Dataset

Dipakai sebagai tambahan sinyal turbidity.

Important fix:

Jangan menentukan clean/dirty hanya dari full path string karena root folder bernama:

```txt
clean-dirty-water-dataset
```

Kalau logic-nya hanya `"clean" in path`, semua path bisa salah terbaca sebagai clean. Implementasi clean harus melihat folder parent spesifik seperti `Clean-samples`, dan dirty harus melihat `Dirty-samples`.

---

## 6. Pseudo-label RIWA Turbidity

Karena label turbidity real sangat terbatas, RIWA digunakan untuk pseudo-labeling turbidity berbasis water mask.

### 6.1 Prinsip

1. Ambil image RIWA.
2. Cari mask air yang sesuai.
3. Resize image dan mask ke `256x256`.
4. Ambil hanya pixel yang termasuk water mask.
5. Konversi RGB ke HSV.
6. Hitung indikasi brown/gray/dark/green.
7. Konversi skor ke label turbidity.

### 6.2 Formula Pseudo Turbidity Score

```python
score = (
    0.50 * brown_ratio +
    0.25 * gray_ratio +
    0.15 * dark_ratio +
    0.10 * green_ratio
)
```

### 6.3 Mapping Score ke Label

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

Ambiguous range sengaja dijadikan `unknown` agar tidak memasukkan label noisy ke training.

---

## 7. Binary Turbidity v1

Karena data 5-class tidak seimbang, model v1 hanya menggunakan binary turbidity.

Mapping final:

```txt
clear       -> turbid_water_v1 = 0
trubid      -> turbid_water_v1 = 1
very_turbid -> turbid_water_v1 = 1
dirty       -> turbid_water_v1 = 1
unknown     -> turbid_water_v1 = -1
```

Kolom final:

```txt
turbid_water_v1
turbidity_level_v1
```

Distribusi akhir yang digunakan:

```txt
turbidity_level_v1:
unknown = 3768
clear   = 493
turbid  = 318
```

---

## 8. Cleaning Corrupt Images

Saat training ditemukan gambar corrupt seperti:

```txt
water_pollution_004337.jpg
```

Karena itu pipeline menambahkan validasi image.

Validasi dilakukan dengan:

```python
with Image.open(path) as img:
    img.verify()
```

Lalu image dibuka ulang dan dicek ukuran minimal:

```python
if width < 20 or height < 20:
    invalid
```

File invalid dihapus dari folder working dan row terkait dihapus dari `labels.csv`.

---

## 9. Train / Validation / Test Split

Split dibuat dari dataset clean:

```txt
train = 70%
val   = 15%
test  = 15%
```

Stratification dilakukan berdasarkan `is_water_scene`, karena label ini paling lengkap dan paling penting.

Distribusi split final:

```txt
Train: 3205
Val:    687
Test:   687
```

Distribusi label:

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

Model menggunakan backbone:

```txt
EfficientNet-B0 pretrained ImageNet
```

Backbone classifier bawaan diganti menjadi identity, lalu ditambahkan tiga binary head.

```python
self.heads = nn.ModuleDict({
    "is_water_scene": nn.Linear(in_features, 1),
    "floating_trash": nn.Linear(in_features, 1),
    "turbid_water": nn.Linear(in_features, 1),
})
```

Output setiap head berupa logit scalar.

Logit dikonversi menjadi probabilitas dengan sigmoid:

```python
prob = torch.sigmoid(logit)
```

---

## 11. Training Configuration

Konfigurasi training:

```python
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 8
LR = 1e-4
WEIGHT_DECAY = 1e-4
OPTIMIZER = AdamW
```

Augmentasi training:

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

## 12. Loss Function dengan Masking Unknown Label

Loss menggunakan binary cross entropy with logits.

Karena beberapa task memiliki label `-1`, loss dihitung hanya untuk label valid.

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

Karena class imbalance cukup besar pada `floating_trash`, digunakan `pos_weight`.

Final pos weight:

```txt
is_water_scene = 1.192
floating_trash = 6.522
turbid_water   = 1.717
```

---

## 13. Evaluation Metrics

Metric yang digunakan:

- accuracy,
- precision,
- recall,
- F1 score,
- TP/TN/FP/FN.

Metric juga hanya dihitung pada label valid, bukan `-1`.

---

## 14. Training Result

Training terbaik tersimpan di:

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

Interpretasi:

- `is_water_scene` sangat kuat untuk prototype.
- `floating_trash` sangat baik pada test set, tetapi tetap perlu hati-hati terhadap dataset bias.
- `turbid_water` cukup baik untuk weak visual turbidity baseline, tetapi bukan pengukuran ilmiah/lab-grade.

---

## 15. Threshold Tuning

Threshold awal semua task adalah `0.5`. Setelah dilihat pada sample prediction, `floating_trash` terlalu sensitif sehingga dilakukan threshold tuning di validation set.

Hasil threshold tuning:

```txt
Best water threshold  = 0.20
Best trash threshold  = 0.85
Best turbid threshold = 0.30
```

Namun untuk inference final, `is_water_scene` tetap dibuat `0.50` agar foto non-water tidak terlalu mudah lolos sebagai water scene.

Final threshold WAVE v1:

```python
TASK_THRESHOLDS = {
    "is_water_scene": 0.50,
    "floating_trash": 0.85,
    "turbid_water": 0.30,
}
```

---

## 16. Inference Pipeline

Inference pipeline menerima satu gambar, lalu menghasilkan JSON final.

Urutan proses:

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

Image quality checker tidak menggunakan ML. Ini menggunakan heuristic berbasis piksel.

Yang dicek:

| Issue | Kondisi |
|---|---|
| `low_resolution` | width < 640 atau height < 480 |
| `too_dark` | mean brightness < 0.18 |
| `too_bright` | mean brightness > 0.88 |
| `overexposed` | area sangat terang > 25% |
| `blurry` | Laplacian variance < 80 |
| `blank_or_blocked` | color standard deviation terlalu rendah |

Quality score dimulai dari `1.0`, lalu dikurangi berdasarkan issue.

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

`water_color` tidak dilatih oleh model. Field ini dihitung menggunakan image processing dari area tengah-bawah gambar.

Alasannya:

- label warna air belum tersedia secara reliable,
- model warna bisa bias terhadap dataset,
- heuristic cukup untuk memberi explanation signal pada MVP.

### 18.1 Crop Region

Crop yang dipakai:

```python
crop = arr[
    int(h * 0.30): int(h * 0.95),
    int(w * 0.10): int(w * 0.90),
    :
]
```

Crop ini dipilih karena pada foto water scene, area air sering berada di tengah hingga bawah gambar.

### 18.2 HSV Rule

Image RGB dikonversi ke HSV, lalu dicek rasio warna:

- brown,
- green,
- gray,
- dark/black.

Output `water_color`:

```txt
clear
brown
dark_brown
green
gray
black
unknown
```

Setiap warna juga menghasilkan `abnormal_color_score`.

Contoh:

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

Salah satu rule terpenting di inference:

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

Tujuannya agar foto gedung, jalan, gunung, atau non-water tidak menghasilkan skor pencemaran air.

Contoh output non-water:

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

Model hanya memprediksi binary `turbid_water`.

`turbidity_level` dibuat heuristic:

```python
if turbid_prob < TASK_THRESHOLDS["turbid_water"]:
    return "clear"

if turbid_prob >= 0.85 and water_color in {"dark_brown", "black", "gray"}:
    return "very_turbid"

return "turbid"
```

Catatan:

- Ini bukan 5-class turbidity model.
- Ini hanya label human-readable untuk dashboard.
- Untuk scientific measurement, tetap dibutuhkan sensor/lab/ground-truth.

---

## 21. Severity Score

Severity score dihitung setelah model inference dan water color detection.

Jika bukan water scene:

```python
severity_score = 0.0
```

Jika water scene:

```python
severity_score = (
    0.50 * trash_score +
    0.40 * turbidity_score +
    0.10 * color_score
)
```

Keterangan:

| Komponen | Bobot | Sumber |
|---|---:|---|
| `trash_score` | 0.50 | probabilitas model `floating_trash` |
| `turbidity_score` | 0.40 | probabilitas model `turbid_water` |
| `color_score` | 0.10 | image processing `water_color` |

Agar lebih stabil, probability hanya dipakai jika final boolean task-nya true:

```python
trash_score = probs["floating_trash"] if floating_trash else 0.0
turbidity_score = probs["turbid_water"] if turbid_water else 0.0
```

---

## 22. Severity Level

Mapping score ke level:

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

Confidence dihitung sebagai rata-rata confidence dari tiga task model.

Untuk setiap task:

- jika prediksi true, confidence = probability,
- jika prediksi false, confidence = `1 - probability`.

```python
task_confidences = [
    probs["is_water_scene"] if is_water_scene else 1.0 - probs["is_water_scene"],
    probs["floating_trash"] if raw_floating_trash else 1.0 - probs["floating_trash"],
    probs["turbid_water"] if raw_turbid_water else 1.0 - probs["turbid_water"],
]

confidence = mean(task_confidences)
```

Confidence menggunakan raw model decision agar tidak misleading setelah non-water gating.

---

## 24. Photo AI Score

`photo_ai_score` adalah skor final kontribusi foto terhadap risiko pencemaran.

Formula:

```python
photo_ai_score = severity_score * confidence * quality_score
```

Makna:

- `severity_score`: seberapa parah indikasi visual pencemaran,
- `confidence`: seberapa yakin model,
- `quality_score`: seberapa layak kualitas gambar.

Jika foto non-water:

```txt
severity_score = 0
photo_ai_score = 0
```

Ini disengaja agar foto tidak relevan tidak menaikkan risk score WAVE.

---

## 25. Needs Review Logic

Foto ditandai untuk review jika:

```python
needs_review = (
    not is_water_scene
    or quality_score < 0.50
    or confidence < 0.60
)
```

Artinya foto akan masuk review jika:

- bukan foto air,
- kualitas buruk,
- model tidak yakin.

---

## 26. Final JSON Output

Output final inference:

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

Debug mode juga tersedia:

```python
predict_photo_ai(image_path, include_debug=True)
```

Debug output menambahkan:

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

Pipeline menghasilkan beberapa artifact:

| File | Fungsi |
|---|---|
| `labels.csv` | label final dataset |
| `splits/train.csv` | split training |
| `splits/val.csv` | split validation |
| `splits/test.csv` | split test |
| `wave_cv_model_v1_best.pth` | checkpoint model terbaik |
| `wave_cv_model_v1_state_dict.pth` | pure state dict model |
| `photo_ai_config_v1.json` | config threshold dan formula |
| `photo_ai_sample_predictions_v1.json` | contoh hasil prediksi |

---

## 28. Config JSON

Config final disimpan sebagai:

```txt
/kaggle/working/wave_cv_dataset/photo_ai_config_v1.json
```

Isi config:

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

Pada backend WAVE, modul ini bisa diekspos sebagai service/API.

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

Suggested columns untuk tabel photo/report evidence:

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

`photo_ai_score` dapat menjadi salah satu komponen risk scoring WAVE.

Contoh formula MVP:

```txt
risk_score =
    0.40 * satellite_anomaly_score +
    0.25 * osm_risk_score +
    0.25 * photo_ai_score +
    0.10 * crowd_report_score
```

Atau jika mengikuti formula PRD awal yang sudah memiliki `crowdsource_count`, modul Photo AI bisa menggantikan/meningkatkan komponen crowdsourcing:

```txt
photo_signal = normalize(crowdsource_count) * average(photo_ai_score)
```

Dengan begitu laporan warga tidak hanya dihitung jumlahnya, tetapi juga kualitas dan indikasi visualnya.

---

## 31. Known Limitations

Implementasi v1 sudah cukup untuk MVP, tetapi belum production-grade.

Limitasi utama:

1. Dataset berasal dari beberapa sumber berbeda, sehingga ada risiko dataset bias.
2. `floating_trash` bisa belajar shortcut dari dataset source, bukan hanya objek sampah.
3. `turbid_water` menggunakan pseudo-label, bukan ground-truth ilmiah.
4. `water_color` hanya menggunakan crop heuristic, bukan segmentation model.
5. Foto citizen real-world kemungkinan lebih noisy dibanding dataset Kaggle.
6. Belum ada localization/segmentation untuk sampah.
7. Belum ada calibration model probability.
8. Belum ada geographic consistency check di dalam CV module.

---

## 32. Recommended Next Improvements

Jika proyek dilanjutkan setelah MVP, improvement yang disarankan:

### 32.1 Data Improvement

- Tambah real citizen photos dari Vietnam.
- Manual-label RIWA sebagai water no-trash hard negative.
- Tambah label `floating_trash=0` untuk water scene tanpa sampah.
- Buat dataset validation yang tidak overlap source dengan training.
- Tambah label manual untuk turbidity 3-level: `clear`, `turbid`, `dirty`.

### 32.2 Model Improvement

- Tambah segmentation model untuk water region.
- Tambah object detection/segmentation untuk trash.
- Gunakan calibrated probability.
- Coba MobileNetV3 untuk deployment lebih ringan.
- Export model ke ONNX untuk backend inference.

### 32.3 System Improvement

- Tambah GPS-zone validation.
- Tambah duplicate image detection.
- Tambah EXIF timestamp validation.
- Tambah async inference queue.
- Simpan debug output hanya di environment development.

---

## 33. Final Status

Status implementasi AI/CV WAVE v1:

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

Kesimpulan:

```txt
AI/CV Photo Validator v1 is ready for WAVE MVP / hackathon prototype.
```

Modul ini belum diklaim sebagai production-grade environmental monitoring model, tetapi sudah cukup kuat untuk membuktikan workflow WAVE:

```txt
Citizen photo -> AI validation -> photo_ai_score -> zone risk scoring -> dashboard insight
```
