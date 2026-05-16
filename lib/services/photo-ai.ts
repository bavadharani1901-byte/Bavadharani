import fs from "fs";
import path from "path";

// Calls the FastAPI Photo AI service when PHOTO_AI_API_URL is configured.
// Falls back to deterministic mock data so local demos still work if the
// Python model service is not running.

interface PhotoAiConfig {
  model_name: string;
  backbone: string;
  image_size: number;
  tasks: string[];
  thresholds: {
    is_water_scene: number;
    floating_trash: number;
    turbid_water: number;
  };
  severity_formula: {
    trash_weight: number;
    turbidity_weight: number;
    water_color_weight: number;
  };
  photo_ai_score_formula: string;
  notes: string[];
}

let _config: PhotoAiConfig | null = null;

function loadConfig(): PhotoAiConfig {
  if (_config) return _config;
  const configPath = path.join(
    process.cwd(),
    "ai",
    "water-cv",
    "photo_ai_config_v1.json",
  );
  if (fs.existsSync(configPath)) {
    _config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as PhotoAiConfig;
  } else {
    _config = {
      model_name: "wave_cv_model_v1",
      backbone: "efficientnet_b0",
      image_size: 224,
      tasks: ["is_water_scene", "floating_trash", "turbid_water"],
      thresholds: {
        is_water_scene: 0.5,
        floating_trash: 0.85,
        turbid_water: 0.3,
      },
      severity_formula: {
        trash_weight: 0.5,
        turbidity_weight: 0.4,
        water_color_weight: 0.1,
      },
      photo_ai_score_formula: "severity_score * confidence * quality_score",
      notes: [],
    };
  }
  return _config;
}

function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h / 4294967296; // normalize to 0-1
}

export interface PhotoAiResult {
  is_water_scene: boolean;
  image_quality: string;
  quality_score: number;
  quality_issues: string[];
  floating_trash: boolean;
  turbid_water: boolean;
  turbidity_level: string;
  water_color: string;
  severity_score: number;
  severity_level: string;
  confidence: number;
  photo_ai_score: number;
  needs_review: boolean;
  source?: string;
}

export async function analyzePhoto(imagePath: string): Promise<PhotoAiResult> {
  const fastApiResult = await analyzePhotoWithFastApi(imagePath);
  if (fastApiResult) return fastApiResult;
  return analyzePhotoWithMock(imagePath);
}

async function analyzePhotoWithFastApi(imageUrl: string): Promise<PhotoAiResult | null> {
  const baseUrl = process.env.PHOTO_AI_API_URL?.replace(/\/$/, "");
  if (!baseUrl) return null;

  // The FastAPI service accepts fetchable URLs. Relative local demo paths keep
  // using the mock fallback unless NEXT_PUBLIC_APP_URL is provided.
  const resolvedImageUrl = resolveImageUrl(imageUrl);
  if (!resolvedImageUrl) return null;

  try {
    const response = await fetch(`${baseUrl}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: resolvedImageUrl,
        include_debug: process.env.PHOTO_AI_DEBUG === "true",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      console.warn("Photo AI FastAPI returned non-OK status", response.status);
      return null;
    }

    const result = (await response.json()) as PhotoAiResult;
    return result;
  } catch (error) {
    console.warn("Photo AI FastAPI unavailable; using mock fallback.", error);
    return null;
  }
}

function resolveImageUrl(imageUrl: string): string | null {
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.AUTH_URL;
  if (!appUrl || !imageUrl.startsWith("/")) return null;

  return `${appUrl.replace(/\/$/, "")}${imageUrl}`;
}

async function analyzePhotoWithMock(imagePath: string): Promise<PhotoAiResult> {
  const config = loadConfig();
  const seed = hashString(imagePath);

  // Deterministic mock based on path hash
  const isWaterScene = seed > 0.15; // 85% water scene
  const qualityScore = 0.5 + seed * 0.5; // 0.5 - 1.0
  const qualityIssues: string[] = [];
  if (qualityScore < 0.6) qualityIssues.push("low_resolution");
  if (seed > 0.9) qualityIssues.push("too_dark");

  let qualityLabel = "good";
  if (qualityScore < 0.5) qualityLabel = "poor";
  else if (qualityScore < 0.75) qualityLabel = "acceptable";

  const floatingTrashProb = seed > 0.4 ? 0.86 + (seed % 0.13) : 0.1 + (seed % 0.3);
  const turbidProb = 0.2 + (seed % 0.75);

  const floatingTrash = floatingTrashProb >= config.thresholds.floating_trash;
  const turbidWater = turbidProb >= config.thresholds.turbid_water;

  // Water color heuristic
  const colors = ["clear", "brown", "dark_brown", "green", "gray", "black", "unknown"];
  const waterColor = isWaterScene ? colors[Math.floor(seed * colors.length)] : "unknown";

  // Turbidity level
  let turbidityLevel = "clear";
  if (turbidWater) {
    if (turbidProb >= 0.85 && ["dark_brown", "black", "gray"].includes(waterColor)) {
      turbidityLevel = "very_turbid";
    } else {
      turbidityLevel = "turbid";
    }
  }

  // Confidence
  const waterConf = isWaterScene ? floatingTrashProb : 1 - floatingTrashProb;
  const trashConf = floatingTrash ? floatingTrashProb : 1 - floatingTrashProb;
  const turbidConf = turbidWater ? turbidProb : 1 - turbidProb;
  const confidence = (waterConf + trashConf + turbidConf) / 3;

  // Severity
  let severityScore = 0.0;
  if (isWaterScene) {
    const trashScore = floatingTrash ? floatingTrashProb : 0.0;
    const turbidityScore = turbidWater ? turbidProb : 0.0;
    const colorScore = waterColor === "clear" ? 0.0 : 0.55;
    severityScore =
      config.severity_formula.trash_weight * trashScore +
      config.severity_formula.turbidity_weight * turbidityScore +
      config.severity_formula.water_color_weight * colorScore;
  }
  severityScore = Math.max(0, Math.min(1, severityScore));

  let severityLevel = "low";
  if (severityScore > 0.75) severityLevel = "critical";
  else if (severityScore > 0.50) severityLevel = "high";
  else if (severityScore > 0.25) severityLevel = "moderate";

  const photoAiScore = severityScore * confidence * qualityScore;

  const needsReview = !isWaterScene || qualityScore < 0.5 || confidence < 0.6;

  return {
    is_water_scene: isWaterScene,
    image_quality: qualityLabel,
    quality_score: parseFloat(qualityScore.toFixed(3)),
    quality_issues: qualityIssues,
    floating_trash: floatingTrash,
    turbid_water: turbidWater,
    turbidity_level: turbidityLevel,
    water_color: waterColor,
    severity_score: parseFloat(severityScore.toFixed(3)),
    severity_level: severityLevel,
    confidence: parseFloat(confidence.toFixed(3)),
    photo_ai_score: parseFloat(photoAiScore.toFixed(3)),
    needs_review: needsReview,
    source: "mock_fallback",
  };
}
