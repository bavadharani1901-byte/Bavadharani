# # WAVE CV — Clean MVP Notebook
#
# Notebook ini sudah dirapihin untuk pipeline **AI Photo Validator WAVE v1**.
#
# Yang dipakai di v1:
# - `is_water_scene`
# - `floating_trash`
# - `turbid_water_v1`
#
# Yang tidak dilatih:
# - `trash_density`
# - `water_color` label training
#
# `water_color` dihitung dari image processing saat inference.


# =========================
# 0. SETUP & CONFIG
# =========================
from pathlib import Path
from collections import defaultdict
import json
import os
import random
import shutil

import numpy as np
import pandas as pd

from PIL import Image, ImageFile
from matplotlib.colors import rgb_to_hsv
import matplotlib.pyplot as plt

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models

from sklearn.model_selection import train_test_split

ImageFile.LOAD_TRUNCATED_IMAGES = True

# -------------------------
# Reproducibility
# -------------------------
SEED = 42

def seed_everything(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)

seed_everything(SEED)

# -------------------------
# Kaggle dataset paths
# -------------------------
CLEAN_DIRTY_ROOT = Path("/kaggle/input/datasets/elvinagammed/clean-dirty-water-dataset")
INTEL_ROOT = Path("/kaggle/input/datasets/rahmasleam/intel-image-dataset")
RIVER_PLASTIC_ROOT = Path("/kaggle/input/datasets/abhranta/narmada-river-plastic-pollution-detection")
WATER_POLLUTION_ROOT = Path("/kaggle/input/datasets/kabeer2004/water-pollution-images")
RIWA_ROOT = Path("/kaggle/input/datasets/franzwagner/river-water-segmentation-dataset")

# -------------------------
# Output paths
# -------------------------
ROOT = Path("/kaggle/working/wave_cv_dataset")
IMG_DIR = ROOT / "images"
SPLIT_DIR = ROOT / "splits"

LABEL_PATH = ROOT / "labels.csv"
TRAIN_CSV = SPLIT_DIR / "train.csv"
VAL_CSV = SPLIT_DIR / "val.csv"
TEST_CSV = SPLIT_DIR / "test.csv"

BEST_MODEL_PATH = ROOT / "wave_cv_model_v1_best.pth"
STATE_DICT_PATH = ROOT / "wave_cv_model_v1_state_dict.pth"
CONFIG_PATH = ROOT / "photo_ai_config_v1.json"
SAMPLE_PRED_PATH = ROOT / "photo_ai_sample_predictions_v1.json"

# -------------------------
# Training config
# -------------------------
IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 8
LR = 1e-4
WEIGHT_DECAY = 1e-4

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# Kalau mau rebuild dataset dari nol, biarkan True.
# Kalau dataset / labels.csv sudah ada dan tidak mau ditimpa, ubah ke False.
RESET_DATASET = True

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MAX_INTEL_PER_CLASS = 1000

# Final inference thresholds dari tuning sebelumnya.
TASK_THRESHOLDS = {
    "is_water_scene": 0.50,
    "floating_trash": 0.85,
    "turbid_water": 0.30,
}

print("Device:", DEVICE)
print("Torch:", torch.__version__)
print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
    print("Capability:", torch.cuda.get_device_capability(0))

print("\nDataset roots:")
for root in [CLEAN_DIRTY_ROOT, INTEL_ROOT, RIVER_PLASTIC_ROOT, WATER_POLLUTION_ROOT, RIWA_ROOT]:
    print(root, "EXISTS" if root.exists() else "NOT FOUND")

print("\nFinal thresholds:", TASK_THRESHOLDS)


# =========================
# 1. BUILD LABELS.CSV + COPY IMAGES
# =========================

def is_image(path: Path) -> bool:
    return path.is_file() and path.suffix.lower() in IMAGE_EXTS


def get_images(root: Path):
    if not root.exists():
        print(f"WARNING: root not found: {root}")
        return []
    return [p for p in root.rglob("*") if is_image(p)]


def clean_or_create_output_dirs():
    if RESET_DATASET and ROOT.exists():
        shutil.rmtree(ROOT)

    ROOT.mkdir(exist_ok=True)
    IMG_DIR.mkdir(exist_ok=True)
    SPLIT_DIR.mkdir(exist_ok=True)


def copy_dataset_images():
    clean_or_create_output_dirs()

    rows = []
    used_sources = set()

    columns = [
        "filename",
        "source_path",
        "source_dataset",
        "is_water_scene",
        "floating_trash",
        "turbid_water",
        "turbidity_level",
    ]

    def safe_copy_image(src_path: Path, prefix: str, labels: dict):
        src_path = Path(src_path)

        if not is_image(src_path):
            return

        src_key = str(src_path)
        if src_key in used_sources:
            return

        used_sources.add(src_key)

        new_name = f"{prefix}_{len(rows):06d}{src_path.suffix.lower()}"
        dst_path = IMG_DIR / new_name
        shutil.copy(src_path, dst_path)

        row = {
            "filename": new_name,
            "source_path": str(src_path),
            "source_dataset": prefix,
            "is_water_scene": -1,
            "floating_trash": -1,
            "turbid_water": -1,
            "turbidity_level": "unknown",
        }
        row.update(labels)
        rows.append(row)

    # -------------------------
    # 1. Clean / Dirty Water
    # -------------------------
    print("\nProcessing Clean Dirty Water...")

    for img in get_images(CLEAN_DIRTY_ROOT):
        parts = {p.name.lower() for p in img.parents}
        path_str = str(img).lower()

        # Fix bug lama:
        # Jangan pakai "clean" in full path, karena root folder berisi "clean-dirty-water-dataset".
        is_clean = "clean-samples" in parts or "/clean-samples/" in path_str
        is_dirty = "dirty-samples" in parts or "/dirty-samples/" in path_str

        if is_clean:
            safe_copy_image(img, "clean_dirty", {
                "is_water_scene": 1,
                "floating_trash": 0,
                "turbid_water": 0,
                "turbidity_level": "clear",
            })

        elif is_dirty:
            safe_copy_image(img, "clean_dirty", {
                "is_water_scene": 1,
                "floating_trash": 0,
                "turbid_water": 1,
                "turbidity_level": "dirty",
            })

    print("Rows after Clean Dirty:", len(rows))

    # -------------------------
    # 2. Intel negative images
    # -------------------------
    print("\nProcessing Intel Image Dataset...")

    # Exclude "sea" because it is water.
    negative_classes = {"buildings", "forest", "glacier", "mountain", "street"}
    intel_by_class = defaultdict(list)

    for img in get_images(INTEL_ROOT):
        parts = {p.name.lower() for p in img.parents}
        matched = parts.intersection(negative_classes)

        if matched:
            cls = sorted(matched)[0]
            intel_by_class[cls].append(img)

    for cls, imgs in sorted(intel_by_class.items()):
        selected = random.sample(imgs, min(MAX_INTEL_PER_CLASS, len(imgs)))
        print(f"Intel class {cls}: using {len(selected)} / {len(imgs)}")

        for img in selected:
            safe_copy_image(img, "intel_negative", {
                "is_water_scene": 0,
                "floating_trash": 0,
                "turbid_water": 0,
                "turbidity_level": "unknown",
            })

    print("Rows after Intel:", len(rows))

    # -------------------------
    # 3. RIWA river water
    # -------------------------
    print("\nProcessing RIWA...")

    for img in get_images(RIWA_ROOT):
        path_str = str(img).lower()

        if any(x in path_str for x in ["mask", "label", "annotation"]):
            continue

        safe_copy_image(img, "riwa", {
            "is_water_scene": 1,
            "floating_trash": -1,
            "turbid_water": -1,
            "turbidity_level": "unknown",
        })

    print("Rows after RIWA:", len(rows))

    # -------------------------
    # 4. River Plastic / Narmada
    # -------------------------
    print("\nProcessing River Plastic Pollution...")

    for img in get_images(RIVER_PLASTIC_ROOT):
        path_str = str(img).lower()

        if any(x in path_str for x in ["predict", "mask", "label", "annotation"]):
            continue

        safe_copy_image(img, "river_plastic", {
            "is_water_scene": 1,
            "floating_trash": 1,
            "turbid_water": -1,
            "turbidity_level": "unknown",
        })

    print("Rows after River Plastic:", len(rows))

    # -------------------------
    # 5. Water Pollution Images
    # -------------------------
    print("\nProcessing Water Pollution Images...")

    for img in get_images(WATER_POLLUTION_ROOT):
        path_str = str(img).lower()

        if any(x in path_str for x in ["mask", "label", "annotation"]):
            continue

        safe_copy_image(img, "water_pollution", {
            "is_water_scene": 1,
            "floating_trash": 1,
            "turbid_water": -1,
            "turbidity_level": "unknown",
        })

    print("Rows after Water Pollution:", len(rows))

    df = pd.DataFrame(rows, columns=columns)

    if len(df) > 0:
        df = df.sample(frac=1, random_state=SEED).reset_index(drop=True)

    df.to_csv(LABEL_PATH, index=False)

    print("\n==============================")
    print("DATASET BUILD DONE")
    print("==============================")
    print("Total rows:", len(df))
    print("Images folder:", IMG_DIR)
    print("Labels CSV:", LABEL_PATH)

    if len(df) > 0:
        print("\nSource dataset counts:")
        print(df["source_dataset"].value_counts(dropna=False))

        print("\nis_water_scene:")
        print(df["is_water_scene"].value_counts(dropna=False))

        print("\nfloating_trash:")
        print(df["floating_trash"].value_counts(dropna=False))

        print("\nturbid_water:")
        print(df["turbid_water"].value_counts(dropna=False))

        print("\nturbidity_level:")
        print(df["turbidity_level"].value_counts(dropna=False))

    return df


df = copy_dataset_images()
display(df.head(10))


# =========================
# 2. PSEUDO-LABEL RIWA TURBIDITY, CLEAN IMAGES, BUILD SPLITS
# =========================

def build_riwa_mask_lookup():
    mask_files = []

    if not RIWA_ROOT.exists():
        return {}

    for p in RIWA_ROOT.rglob("*"):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            if "mask" in str(p).lower():
                mask_files.append(p)

    mask_lookup = {}
    for m in mask_files:
        mask_lookup[m.stem] = m

    print("RIWA masks found:", len(mask_lookup))
    return mask_lookup


def find_riwa_mask(source_path, mask_lookup):
    src = Path(source_path)
    stem = src.stem

    if stem in mask_lookup:
        return mask_lookup[stem]

    # Fallback fuzzy stem match.
    for k, v in mask_lookup.items():
        if k == stem or stem in k or k in stem:
            return v

    return None


def compute_water_mask_turbidity(img_path, mask_path):
    try:
        img = Image.open(img_path).convert("RGB").resize((256, 256))
        mask = Image.open(mask_path).convert("L").resize((256, 256))
    except Exception:
        return None

    arr = np.asarray(img).astype(np.float32) / 255.0
    mask_arr = np.asarray(mask).astype(np.float32) / 255.0

    water_mask = mask_arr > 0.5

    water_ratio = float(water_mask.mean())
    if water_ratio < 0.05 or water_ratio > 0.95:
        return None

    water_pixels = arr[water_mask]
    hsv = rgb_to_hsv(water_pixels.reshape(-1, 1, 3)).reshape(-1, 3)

    hue = hsv[:, 0]
    sat = hsv[:, 1]
    val = hsv[:, 2]

    mean_v = float(val.mean())

    # Skip bad exposure.
    if mean_v < 0.18 or mean_v > 0.92:
        return None

    brown = (
        (hue >= 0.04) & (hue <= 0.16) &
        (sat >= 0.18) &
        (val >= 0.15)
    ).mean()

    gray = (
        (sat <= 0.18) &
        (val >= 0.18) & (val <= 0.75)
    ).mean()

    dark = (val <= 0.28).mean()

    green = (
        (hue >= 0.20) & (hue <= 0.45) &
        (sat >= 0.22) &
        (val <= 0.78)
    ).mean()

    score = (
        0.50 * brown +
        0.25 * gray +
        0.15 * dark +
        0.10 * green
    )

    return float(score)


def score_to_turbidity_label(score):
    if score is None:
        return -1, "unknown"

    if score <= 0.12:
        return 0, "clear"

    # Ambiguous range. Better keep unknown than noisy label.
    if score < 0.28:
        return -1, "unknown"

    if score < 0.50:
        return 1, "turbid"

    if score < 0.70:
        return 1, "very_turbid"

    return 1, "dirty"


def apply_riwa_pseudo_turbidity(df):
    df = df.copy()

    df["pseudo_turbidity_score"] = np.nan
    df["turbidity_label_source"] = "original"
    df.loc[df["turbid_water"] == -1, "turbidity_label_source"] = "unknown"

    mask_lookup = build_riwa_mask_lookup()

    target = (
        (df["source_dataset"] == "riwa") &
        (df["is_water_scene"] == 1) &
        (df["turbid_water"] == -1)
    )

    updated = 0
    skipped = 0

    for idx, row in df[target].iterrows():
        mask_path = find_riwa_mask(row["source_path"], mask_lookup)

        if mask_path is None:
            skipped += 1
            df.loc[idx, "turbidity_label_source"] = "still_unknown"
            continue

        img_path = IMG_DIR / row["filename"]
        score = compute_water_mask_turbidity(img_path, mask_path)
        turbid_water, level = score_to_turbidity_label(score)

        if turbid_water == -1:
            skipped += 1
            df.loc[idx, "turbidity_label_source"] = "still_unknown"
            continue

        df.loc[idx, "pseudo_turbidity_score"] = score
        df.loc[idx, "turbid_water"] = turbid_water
        df.loc[idx, "turbidity_level"] = level
        df.loc[idx, "turbidity_label_source"] = "pseudo_riwa_mask"
        updated += 1

    print("RIWA pseudo turbidity updated:", updated)
    print("RIWA pseudo turbidity skipped:", skipped)

    return df


def build_binary_turbidity_v1(df):
    df = df.copy()

    df["turbidity_level_v1"] = "unknown"

    df.loc[df["turbidity_level"] == "clear", "turbidity_level_v1"] = "clear"
    df.loc[
        df["turbidity_level"].isin(["turbid", "very_turbid", "dirty"]),
        "turbidity_level_v1"
    ] = "turbid"

    df["turbid_water_v1"] = -1
    df.loc[df["turbidity_level_v1"] == "clear", "turbid_water_v1"] = 0
    df.loc[df["turbidity_level_v1"] == "turbid", "turbid_water_v1"] = 1

    return df


def is_valid_image_file(path):
    try:
        with Image.open(path) as img:
            img.verify()

        with Image.open(path) as img:
            img = img.convert("RGB")
            w, h = img.size

        if w < 20 or h < 20:
            return False

        return True
    except Exception:
        return False


def clean_invalid_images(df):
    good_rows = []
    bad_files = []

    for _, row in df.iterrows():
        img_path = IMG_DIR / row["filename"]

        if not img_path.exists():
            bad_files.append((row["filename"], "missing"))
            continue

        if not is_valid_image_file(img_path):
            bad_files.append((row["filename"], "invalid_image"))
            continue

        good_rows.append(row)

    clean_df = pd.DataFrame(good_rows).reset_index(drop=True)

    for filename, _reason in bad_files:
        p = IMG_DIR / filename
        if p.exists():
            try:
                os.remove(p)
            except Exception:
                pass

    print("Original rows:", len(df))
    print("Clean rows:", len(clean_df))
    print("Bad files:", len(bad_files))
    print("Bad examples:", bad_files[:10])

    return clean_df


def make_splits(df):
    required_cols = [
        "filename",
        "is_water_scene",
        "floating_trash",
        "turbid_water_v1",
        "turbidity_level_v1",
    ]

    print("\nChecking required columns...")
    for col in required_cols:
        print(col, "OK" if col in df.columns else "MISSING")

    if not all(col in df.columns for col in required_cols):
        missing = [col for col in required_cols if col not in df.columns]
        raise ValueError(f"Missing columns: {missing}")

    train_df, temp_df = train_test_split(
        df,
        test_size=0.30,
        random_state=SEED,
        stratify=df["is_water_scene"]
    )

    val_df, test_df = train_test_split(
        temp_df,
        test_size=0.50,
        random_state=SEED,
        stratify=temp_df["is_water_scene"]
    )

    SPLIT_DIR.mkdir(exist_ok=True)
    train_df.to_csv(TRAIN_CSV, index=False)
    val_df.to_csv(VAL_CSV, index=False)
    test_df.to_csv(TEST_CSV, index=False)

    print("\nSaved splits:")
    print("Train:", len(train_df), TRAIN_CSV)
    print("Val:", len(val_df), VAL_CSV)
    print("Test:", len(test_df), TEST_CSV)

    return train_df, val_df, test_df


def show_distribution(name, split_df):
    print(f"\n================ {name} ================")

    for col in ["source_dataset", "is_water_scene", "floating_trash", "turbid_water_v1", "turbidity_level_v1"]:
        if col in split_df.columns:
            print(f"\n{col}:")
            print(split_df[col].value_counts(dropna=False))


df = pd.read_csv(LABEL_PATH)
df = apply_riwa_pseudo_turbidity(df)
df = build_binary_turbidity_v1(df)
df = clean_invalid_images(df)

df.to_csv(LABEL_PATH, index=False)

print("\nFinal label distribution:")
show_distribution("FULL CLEAN DATASET", df)

train_df, val_df, test_df = make_splits(df)

show_distribution("TRAIN", train_df)
show_distribution("VAL", val_df)
show_distribution("TEST", test_df)


# =========================
# 3. TRAIN MODEL + FINAL TEST EVALUATION
# =========================

class WaveCVDataset(Dataset):
    def __init__(self, csv_path, img_dir, train=True):
        self.df = pd.read_csv(csv_path).reset_index(drop=True)
        self.img_dir = Path(img_dir)
        self.train = train

        if train:
            self.tfms = transforms.Compose([
                transforms.Resize((IMG_SIZE, IMG_SIZE)),
                transforms.RandomHorizontalFlip(p=0.5),
                transforms.RandomRotation(degrees=8),
                transforms.ColorJitter(
                    brightness=0.15,
                    contrast=0.15,
                    saturation=0.12,
                    hue=0.03
                ),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                )
            ])
        else:
            self.tfms = transforms.Compose([
                transforms.Resize((IMG_SIZE, IMG_SIZE)),
                transforms.ToTensor(),
                transforms.Normalize(
                    mean=[0.485, 0.456, 0.406],
                    std=[0.229, 0.224, 0.225]
                )
            ])

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img_path = self.img_dir / row["filename"]

        img = Image.open(img_path).convert("RGB")
        img = self.tfms(img)

        labels = {
            "is_water_scene": torch.tensor(float(row["is_water_scene"]), dtype=torch.float32),
            "floating_trash": torch.tensor(float(row["floating_trash"]), dtype=torch.float32),
            "turbid_water": torch.tensor(float(row["turbid_water_v1"]), dtype=torch.float32),
        }

        return img, labels


class WaveCVModel(nn.Module):
    def __init__(self):
        super().__init__()

        try:
            weights = models.EfficientNet_B0_Weights.DEFAULT
            backbone = models.efficientnet_b0(weights=weights)
            print("Loaded pretrained EfficientNet-B0")
        except Exception as e:
            print("Could not load pretrained EfficientNet-B0:", repr(e))
            backbone = models.efficientnet_b0(weights=None)
            print("Loaded EfficientNet-B0 without pretrained weights")

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
        return {
            name: head(feats).squeeze(1)
            for name, head in self.heads.items()
        }


def get_pos_weight(df, col):
    valid = df[df[col] != -1]
    pos = int((valid[col] == 1).sum())
    neg = int((valid[col] == 0).sum())

    if pos == 0:
        return torch.tensor(1.0, dtype=torch.float32)

    return torch.tensor(max(neg / pos, 1.0), dtype=torch.float32)


def masked_bce_loss(logits, targets, pos_weight):
    mask = targets != -1

    if int(mask.sum().item()) == 0:
        return logits.sum() * 0.0

    return F.binary_cross_entropy_with_logits(
        logits[mask],
        targets[mask],
        pos_weight=pos_weight
    )


def compute_loss(outputs, labels):
    loss_water = masked_bce_loss(
        outputs["is_water_scene"],
        labels["is_water_scene"],
        pos_weights["is_water_scene"]
    )

    loss_trash = masked_bce_loss(
        outputs["floating_trash"],
        labels["floating_trash"],
        pos_weights["floating_trash"]
    )

    loss_turbid = masked_bce_loss(
        outputs["turbid_water"],
        labels["turbid_water"],
        pos_weights["turbid_water"]
    )

    total = loss_water + loss_trash + loss_turbid

    return total, {
        "water": float(loss_water.item()),
        "trash": float(loss_trash.item()),
        "turbid": float(loss_turbid.item()),
    }


def binary_metrics(y_true, y_pred):
    y_true = np.array(y_true)
    y_pred = np.array(y_pred)

    tp = int(((y_true == 1) & (y_pred == 1)).sum())
    tn = int(((y_true == 0) & (y_pred == 0)).sum())
    fp = int(((y_true == 0) & (y_pred == 1)).sum())
    fn = int(((y_true == 1) & (y_pred == 0)).sum())

    acc = (tp + tn) / max(tp + tn + fp + fn, 1)
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-8)

    return {
        "acc": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
    }


@torch.no_grad()
def evaluate(loader, threshold=0.5):
    model.eval()

    store = {
        "is_water_scene": {"true": [], "pred": []},
        "floating_trash": {"true": [], "pred": []},
        "turbid_water": {"true": [], "pred": []},
    }

    total_loss = 0.0
    batches = 0

    for imgs, labels in loader:
        imgs = imgs.to(DEVICE)
        labels = {k: v.to(DEVICE) for k, v in labels.items()}

        outputs = model(imgs)
        loss, _parts = compute_loss(outputs, labels)

        total_loss += float(loss.item())
        batches += 1

        for task in store.keys():
            probs = torch.sigmoid(outputs[task])
            preds = (probs >= threshold).float()
            targets = labels[task]
            mask = targets != -1

            store[task]["true"].extend(targets[mask].cpu().numpy().tolist())
            store[task]["pred"].extend(preds[mask].cpu().numpy().tolist())

    metrics = {}
    for task in store.keys():
        if len(store[task]["true"]) > 0:
            metrics[task] = binary_metrics(store[task]["true"], store[task]["pred"])

    avg_f1 = float(np.mean([m["f1"] for m in metrics.values()])) if metrics else 0.0

    return total_loss / max(batches, 1), metrics, avg_f1


# -------------------------
# DataLoaders
# -------------------------
train_ds = WaveCVDataset(TRAIN_CSV, IMG_DIR, train=True)
val_ds = WaveCVDataset(VAL_CSV, IMG_DIR, train=False)
test_ds = WaveCVDataset(TEST_CSV, IMG_DIR, train=False)

num_workers = 2 if DEVICE == "cuda" else 0

train_loader = DataLoader(
    train_ds,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=num_workers,
    pin_memory=(DEVICE == "cuda")
)

val_loader = DataLoader(
    val_ds,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=num_workers,
    pin_memory=(DEVICE == "cuda")
)

test_loader = DataLoader(
    test_ds,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=num_workers,
    pin_memory=(DEVICE == "cuda")
)

# -------------------------
# Model / optimizer
# -------------------------
train_df = pd.read_csv(TRAIN_CSV)

pos_weights = {
    "is_water_scene": get_pos_weight(train_df, "is_water_scene").to(DEVICE),
    "floating_trash": get_pos_weight(train_df, "floating_trash").to(DEVICE),
    "turbid_water": get_pos_weight(train_df, "turbid_water_v1").to(DEVICE),
}

print("Pos weights:", {k: float(v.cpu()) for k, v in pos_weights.items()})

model = WaveCVModel().to(DEVICE)
optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)

# -------------------------
# Train loop
# -------------------------
best_f1 = -1.0

for epoch in range(1, EPOCHS + 1):
    model.train()

    train_loss = 0.0
    train_parts = {"water": 0.0, "trash": 0.0, "turbid": 0.0}
    batches = 0

    for imgs, labels in train_loader:
        imgs = imgs.to(DEVICE)
        labels = {k: v.to(DEVICE) for k, v in labels.items()}

        optimizer.zero_grad()
        outputs = model(imgs)
        loss, parts = compute_loss(outputs, labels)

        loss.backward()
        optimizer.step()

        train_loss += float(loss.item())
        for k in train_parts:
            train_parts[k] += float(parts[k])
        batches += 1

    train_loss /= max(batches, 1)
    train_parts = {k: v / max(batches, 1) for k, v in train_parts.items()}

    val_loss, val_metrics, avg_f1 = evaluate(val_loader, threshold=0.5)

    print(f"\nEpoch {epoch}/{EPOCHS}")
    print(f"Train loss: {train_loss:.4f} | parts: {train_parts}")
    print(f"Val loss:   {val_loss:.4f} | avg F1: {avg_f1:.4f}")

    for task, m in val_metrics.items():
        print(
            f"{task:16s} "
            f"acc={m['acc']:.3f} "
            f"p={m['precision']:.3f} "
            f"r={m['recall']:.3f} "
            f"f1={m['f1']:.3f} "
            f"tp={m['tp']} fp={m['fp']} fn={m['fn']}"
        )

    if avg_f1 > best_f1:
        best_f1 = float(avg_f1)

        checkpoint = {
            "model_state_dict": model.state_dict(),
            "best_f1": float(best_f1),
            "epoch": int(epoch),
            "img_size": int(IMG_SIZE),
            "tasks": ["is_water_scene", "floating_trash", "turbid_water"],
        }

        torch.save(checkpoint, BEST_MODEL_PATH)
        torch.save(model.state_dict(), STATE_DICT_PATH)

        print("Saved best model:", BEST_MODEL_PATH)

print("\nTraining done.")
print("Best val avg F1:", best_f1)
print("Best model path:", BEST_MODEL_PATH)

# -------------------------
# Final test eval
# -------------------------
checkpoint = torch.load(
    BEST_MODEL_PATH,
    map_location=DEVICE,
    weights_only=False
)

model.load_state_dict(checkpoint["model_state_dict"])

test_loss, test_metrics, test_avg_f1 = evaluate(test_loader, threshold=0.5)

print("\n==============================")
print("FINAL TEST RESULT")
print("==============================")
print(f"Test loss: {test_loss:.4f} | avg F1: {test_avg_f1:.4f}")

for task, m in test_metrics.items():
    print(
        f"{task:16s} "
        f"acc={m['acc']:.3f} "
        f"p={m['precision']:.3f} "
        f"r={m['recall']:.3f} "
        f"f1={m['f1']:.3f} "
        f"tp={m['tp']} tn={m['tn']} fp={m['fp']} fn={m['fn']}"
    )


# =========================
# 4. OPTIONAL: VALIDATION THRESHOLD TUNING
# =========================
# Cell ini optional.
# Kita tetap pakai final TASK_THRESHOLDS:
# water=0.50, trash=0.85, turbid=0.30

infer_tfms = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


@torch.no_grad()
def get_probs_for_df(df):
    model.eval()
    rows = []

    for _, row in df.iterrows():
        img_path = IMG_DIR / row["filename"]

        try:
            img = Image.open(img_path).convert("RGB")
        except Exception:
            continue

        x = infer_tfms(img).unsqueeze(0).to(DEVICE)
        outputs = model(x)

        probs = {
            task: float(torch.sigmoid(logit).cpu().item())
            for task, logit in outputs.items()
        }

        rows.append({
            "filename": row["filename"],
            "y_water": row["is_water_scene"],
            "p_water": probs["is_water_scene"],
            "y_trash": row["floating_trash"],
            "p_trash": probs["floating_trash"],
            "y_turbid": row["turbid_water_v1"],
            "p_turbid": probs["turbid_water"],
        })

    return pd.DataFrame(rows)


def metrics_at_threshold(y_true, probs, threshold):
    y_true = np.array(y_true)
    probs = np.array(probs)

    pred = (probs >= threshold).astype(int)

    tp = int(((y_true == 1) & (pred == 1)).sum())
    tn = int(((y_true == 0) & (pred == 0)).sum())
    fp = int(((y_true == 0) & (pred == 1)).sum())
    fn = int(((y_true == 1) & (pred == 0)).sum())

    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    f1 = 2 * precision * recall / max(precision + recall, 1e-8)
    acc = (tp + tn) / max(tp + tn + fp + fn, 1)

    return {
        "threshold": float(threshold),
        "acc": float(acc),
        "precision": float(precision),
        "recall": float(recall),
        "f1": float(f1),
        "tp": tp,
        "tn": tn,
        "fp": fp,
        "fn": fn,
    }


def find_best_threshold(pred_df, y_col, p_col, mode="f1"):
    valid = pred_df[pred_df[y_col] != -1].copy()

    results = []
    for th in np.arange(0.10, 0.96, 0.05):
        results.append(metrics_at_threshold(valid[y_col], valid[p_col], th))

    result_df = pd.DataFrame(results)

    if mode == "precision":
        filtered = result_df[result_df["recall"] >= 0.85]
        if len(filtered) == 0:
            filtered = result_df
        best = filtered.sort_values(["precision", "f1"], ascending=False).iloc[0]
    else:
        best = result_df.sort_values("f1", ascending=False).iloc[0]

    return result_df, best


val_df = pd.read_csv(VAL_CSV)
val_pred_df = get_probs_for_df(val_df)

water_th_df, best_water = find_best_threshold(
    val_pred_df,
    "y_water",
    "p_water",
    mode="f1"
)

trash_th_df, best_trash = find_best_threshold(
    val_pred_df,
    "y_trash",
    "p_trash",
    mode="precision"
)

turbid_th_df, best_turbid = find_best_threshold(
    val_pred_df,
    "y_turbid",
    "p_turbid",
    mode="f1"
)

auto_thresholds = {
    "is_water_scene": round(float(best_water["threshold"]), 2),
    "floating_trash": round(float(best_trash["threshold"]), 2),
    "turbid_water": round(float(best_turbid["threshold"]), 2),
}

print("Best water threshold:")
print(best_water)

print("\nBest trash threshold:")
print(best_trash)

print("\nBest turbid threshold:")
print(best_turbid)

print("\nAuto thresholds from validation:")
print(auto_thresholds)

print("\nFinal thresholds used by WAVE v1:")
print(TASK_THRESHOLDS)


# =========================
# 5. FINAL PHOTO AI INFERENCE PIPELINE
# =========================

def load_best_model():
    loaded_model = WaveCVModel().to(DEVICE)

    checkpoint = torch.load(
        BEST_MODEL_PATH,
        map_location=DEVICE,
        weights_only=False
    )

    loaded_model.load_state_dict(checkpoint["model_state_dict"])
    loaded_model.eval()

    print("Loaded model from epoch:", checkpoint.get("epoch"))
    print("Best val F1:", checkpoint.get("best_f1"))

    return loaded_model


# Reload best model for inference.
model = load_best_model()


def laplacian_variance(gray):
    """
    Simple blur score without cv2.
    Higher = sharper, lower = blurrier.
    """
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


def check_image_quality(image_path):
    img = Image.open(image_path).convert("RGB")
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
        }
    }


def detect_water_color(image_path):
    img = Image.open(image_path).convert("RGB")
    img = img.resize((256, 256))

    arr = np.asarray(img).astype(np.float32) / 255.0
    h, w, _ = arr.shape

    # Approximation: center-lower region.
    crop = arr[
        int(h * 0.30): int(h * 0.95),
        int(w * 0.10): int(w * 0.90),
        :
    ]

    hsv = rgb_to_hsv(crop)
    hue = hsv[..., 0]
    sat = hsv[..., 1]
    val = hsv[..., 2]

    mean_v = float(val.mean())
    mean_s = float(sat.mean())

    brown_mask = (
        (hue >= 0.04) & (hue <= 0.16) &
        (sat >= 0.18) &
        (val >= 0.15)
    )

    green_mask = (
        (hue >= 0.20) & (hue <= 0.45) &
        (sat >= 0.22) &
        (val <= 0.78)
    )

    gray_mask = (
        (sat <= 0.18) &
        (val >= 0.18) &
        (val <= 0.75)
    )

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
        abnormal_score = 0.00

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
        }
    }


def severity_level_from_score(score):
    if score <= 0.25:
        return "low"
    if score <= 0.50:
        return "moderate"
    if score <= 0.75:
        return "high"
    return "critical"


def turbidity_level_from_prob(turbid_prob, water_color):
    if turbid_prob < TASK_THRESHOLDS["turbid_water"]:
        return "clear"

    # Heuristic upgrade only, not trained 5-class.
    if turbid_prob >= 0.85 and water_color in {"dark_brown", "black", "gray"}:
        return "very_turbid"

    return "turbid"


@torch.no_grad()
def predict_photo_ai(image_path, include_debug=False):
    image_path = Path(image_path)

    quality_result = check_image_quality(image_path)

    img = Image.open(image_path).convert("RGB")
    x = infer_tfms(img).unsqueeze(0).to(DEVICE)

    outputs = model(x)
    probs = {
        task: float(torch.sigmoid(logit).cpu().item())
        for task, logit in outputs.items()
    }

    is_water_scene = probs["is_water_scene"] >= TASK_THRESHOLDS["is_water_scene"]
    raw_floating_trash = probs["floating_trash"] >= TASK_THRESHOLDS["floating_trash"]
    raw_turbid_water = probs["turbid_water"] >= TASK_THRESHOLDS["turbid_water"]

    # Gate all water-related decisions.
    if not is_water_scene:
        floating_trash = False
        turbid_water = False
        turbidity_level = "unknown"

        color_result = {
            "water_color": "unknown",
            "abnormal_color_score": 0.0,
            "debug": {}
        }

    else:
        floating_trash = raw_floating_trash
        turbid_water = raw_turbid_water

        color_result = detect_water_color(image_path)
        turbidity_level = turbidity_level_from_prob(
            probs["turbid_water"],
            color_result["water_color"]
        )

    task_confidences = [
        probs["is_water_scene"] if is_water_scene else 1.0 - probs["is_water_scene"],
        probs["floating_trash"] if raw_floating_trash else 1.0 - probs["floating_trash"],
        probs["turbid_water"] if raw_turbid_water else 1.0 - probs["turbid_water"],
    ]

    confidence = float(np.mean(task_confidences))

    if not is_water_scene:
        severity_score = 0.0
    else:
        trash_score = probs["floating_trash"] if floating_trash else 0.0
        turbidity_score = probs["turbid_water"] if turbid_water else 0.0
        color_score = color_result["abnormal_color_score"]

        severity_score = (
            0.50 * trash_score +
            0.40 * turbidity_score +
            0.10 * color_score
        )

    severity_score = float(max(0.0, min(1.0, severity_score)))
    severity_level = severity_level_from_score(severity_score)

    quality_score = quality_result["quality_score"]
    photo_ai_score = severity_score * confidence * quality_score

    needs_review = (
        not is_water_scene
        or quality_score < 0.50
        or confidence < 0.60
    )

    result = {
        "is_water_scene": bool(is_water_scene),

        "image_quality": quality_result["image_quality"],
        "quality_score": round(float(quality_score), 3),
        "quality_issues": quality_result["quality_issues"],

        "floating_trash": bool(floating_trash),

        "turbid_water": bool(turbid_water),
        "turbidity_level": turbidity_level,
        "water_color": color_result["water_color"],

        "severity_score": round(float(severity_score), 3),
        "severity_level": severity_level,
        "confidence": round(float(confidence), 3),
        "photo_ai_score": round(float(photo_ai_score), 3),
        "needs_review": bool(needs_review),
    }

    if include_debug:
        result["debug"] = {
            "model_probs": {k: round(v, 3) for k, v in probs.items()},
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
            "thresholds": TASK_THRESHOLDS,
            "quality_debug": quality_result["debug"],
            "color_debug": color_result["debug"],
        }

    return result


def save_photo_ai_config():
    config = {
        "model_name": "wave_cv_model_v1",
        "backbone": "efficientnet_b0",
        "image_size": int(IMG_SIZE),
        "tasks": ["is_water_scene", "floating_trash", "turbid_water"],
        "thresholds": TASK_THRESHOLDS,
        "severity_formula": {
            "trash_weight": 0.50,
            "turbidity_weight": 0.40,
            "water_color_weight": 0.10,
        },
        "photo_ai_score_formula": "severity_score * confidence * quality_score",
        "notes": [
            "floating_trash is binary only",
            "water_color is derived using image processing",
            "turbidity_level is heuristic from binary turbidity probability",
            "non-water images are gated to severity_score=0 and photo_ai_score=0",
        ],
    }

    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)

    print("Saved config:", CONFIG_PATH)


def show_random_predictions(n=6):
    test_df = pd.read_csv(TEST_CSV)

    sample_df = test_df.sample(n, random_state=random.randint(1, 9999))

    cols = min(3, n)
    rows = int(np.ceil(n / cols))

    plt.figure(figsize=(5.5 * cols, 4.2 * rows))

    for i, (_, row) in enumerate(sample_df.iterrows()):
        img_path = IMG_DIR / row["filename"]
        result = predict_photo_ai(img_path, include_debug=True)

        img = Image.open(img_path).convert("RGB")

        plt.subplot(rows, cols, i + 1)
        plt.imshow(img)
        plt.axis("off")
        plt.title(
            f"water={result['is_water_scene']} trash={result['floating_trash']} turbid={result['turbid_water']}\n"
            f"severity={result['severity_level']} score={result['photo_ai_score']}\n"
            f"color={result['water_color']} q={result['image_quality']}",
            fontsize=9
        )

    plt.tight_layout()
    plt.show()

    example_path = IMG_DIR / sample_df.iloc[0]["filename"]
    print("\nExample JSON:")
    print("Image:", example_path)
    print(json.dumps(predict_photo_ai(example_path, include_debug=False), indent=2))


def save_sample_predictions(n=30):
    test_df = pd.read_csv(TEST_CSV)
    sample_results = []

    for _, row in test_df.sample(n, random_state=SEED).iterrows():
        img_path = IMG_DIR / row["filename"]
        result = predict_photo_ai(img_path, include_debug=True)

        sample_results.append({
            "filename": row["filename"],
            "ground_truth": {
                "is_water_scene": int(row["is_water_scene"]),
                "floating_trash": int(row["floating_trash"]),
                "turbid_water_v1": int(row["turbid_water_v1"]),
            },
            "prediction": result,
        })

    with open(SAMPLE_PRED_PATH, "w") as f:
        json.dump(sample_results, f, indent=2)

    print("Saved sample predictions:", SAMPLE_PRED_PATH)


save_photo_ai_config()
show_random_predictions(n=6)
save_sample_predictions(n=30)