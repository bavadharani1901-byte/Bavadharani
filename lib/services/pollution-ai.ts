// RiverGuard AI — Rule-Based Pollution Detection Engine
// DISCLAIMER: This is a keyword-based classification system, NOT a trained ML model.
// Scores are illustrative for demonstration purposes only.

export interface PollutionAnalysis {
  risk_score: number; // 0–100
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  evidence: string[];
  recommendations: string[];
  breakdown: Record<string, number>;
  disclaimer: string;
}

interface CategoryRule {
  label: string;
  keywords: string[];
  base_score: number;
  weight: number;
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    label: "Chemical Waste",
    keywords: ["chemical", "toxic", "industrial", "effluent", "discharge", "factory", "dye", "colour change", "color change", "foam", "bubbles", "smell", "odour", "odor", "pollution"],
    base_score: 75,
    weight: 1.0,
  },
  {
    label: "Sewage / Drainage",
    keywords: ["sewage", "waste water", "wastewater", "drainage", "foul", "feces", "faeces", "toilet", "sewer", "black water", "grey water", "drain"],
    base_score: 65,
    weight: 0.9,
  },
  {
    label: "Oil Spill",
    keywords: ["oil", "petroleum", "grease", "sheen", "slick", "fuel", "diesel", "kerosene", "iridescent"],
    base_score: 70,
    weight: 0.95,
  },
  {
    label: "Plastic / Solid Waste",
    keywords: ["plastic", "bottle", "wrapper", "bag", "polythene", "garbage", "trash", "debris", "floating", "litter", "solid waste"],
    base_score: 45,
    weight: 0.7,
  },
  {
    label: "Turbidity / Sediment",
    keywords: ["muddy", "turbid", "brown", "murky", "cloudy", "sediment", "silt", "dirty", "discoloured", "discolored"],
    base_score: 50,
    weight: 0.75,
  },
];

const SEVERITY_KEYWORDS: Record<string, number> = {
  severe: 20, extreme: 25, critical: 25, heavy: 15, massive: 20,
  large: 10, significant: 10, major: 12, widespread: 15,
  minor: -10, slight: -8, small: -5, little: -5,
};

function matchKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

function scoreText(text: string): number {
  const lower = text.toLowerCase();
  let modifier = 0;
  for (const [kw, delta] of Object.entries(SEVERITY_KEYWORDS)) {
    if (lower.includes(kw)) modifier += delta;
  }
  return modifier;
}

export function analyzePollutionReport(params: {
  description: string;
  pollution_type?: string;
  photo_ai_score?: number;
  location?: string;
}): PollutionAnalysis {
  const { description = "", pollution_type, photo_ai_score = 0, location } = params;
  const fullText = [description, pollution_type ?? "", location ?? ""].join(" ");

  const breakdown: Record<string, number> = {};
  let topCategory = "General Pollution";
  let topScore = 0;
  let topMatches: string[] = [];
  let topRule: CategoryRule | null = null;

  // Match each category
  for (const rule of CATEGORY_RULES) {
    const matches = matchKeywords(fullText, rule.keywords);
    const modScore = scoreText(fullText);
    const rawScore = matches.length > 0
      ? rule.base_score + modScore + matches.length * 3
      : 0;
    const clamped = Math.max(0, Math.min(100, rawScore * rule.weight));
    breakdown[rule.label] = Math.round(clamped);

    if (clamped > topScore) {
      topScore = clamped;
      topCategory = rule.label;
      topMatches = matches;
      topRule = rule;
    }
  }

  // Check if pollution_type was explicitly selected — override category
  if (pollution_type) {
    const ptLower = pollution_type.toLowerCase();
    const found = CATEGORY_RULES.find((r) =>
      r.label.toLowerCase().includes(ptLower) ||
      ptLower.includes(r.label.toLowerCase().split(" ")[0])
    );
    if (found) {
      topCategory = found.label;
      if (breakdown[found.label] === 0) {
        breakdown[found.label] = found.base_score;
      }
      topScore = Math.max(topScore, found.base_score);
      topRule = found;
    }
  }

  // Photo AI score boosts the final risk score
  const photoBoost = photo_ai_score > 0 ? Math.round(photo_ai_score * 20) : 0;

  // Fallback for "Other" or no match
  if (topScore === 0) {
    topScore = 20;
    topCategory = "General Pollution";
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(topScore + photoBoost)));

  let risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  if (finalScore <= 25) risk_level = "LOW";
  else if (finalScore <= 50) risk_level = "MEDIUM";
  else if (finalScore <= 75) risk_level = "HIGH";
  else risk_level = "CRITICAL";

  // Build evidence list
  const evidence: string[] = [];
  if (topMatches.length > 0) {
    evidence.push(`Detected ${topCategory.toLowerCase()} indicators: ${topMatches.slice(0, 4).join(", ")}.`);
  }
  if (photo_ai_score > 0.5) {
    evidence.push(`Photo analysis score: ${(photo_ai_score * 100).toFixed(0)}% — visual pollution indicators present.`);
  }
  if (description.length > 10) {
    evidence.push(`Citizen description analysed for ${topCategory} signals.`);
  }
  if (location) {
    evidence.push(`Location: ${location}.`);
  }
  if (evidence.length === 0) {
    evidence.push("Insufficient specific evidence detected from description.");
  }

  // Build recommendations
  const recommendations: string[] = [];
  if (risk_level === "CRITICAL") {
    recommendations.push("Immediate field inspection required — deploy inspection team within 24 hours.");
    recommendations.push("Notify Tamil Nadu Pollution Control Board (TNPCB).");
    recommendations.push("Collect water samples for laboratory analysis.");
    recommendations.push("Issue public advisory for affected river segment.");
  } else if (risk_level === "HIGH") {
    recommendations.push("Priority inspection recommended within 48–72 hours.");
    recommendations.push("Identify and document pollution source location.");
    recommendations.push("Increase monitoring frequency for this zone.");
  } else if (risk_level === "MEDIUM") {
    recommendations.push("Schedule routine inspection in the next 7 days.");
    recommendations.push("Cross-reference with upstream industrial discharge records.");
    recommendations.push("Update zone monitoring data.");
  } else {
    recommendations.push("Log incident and continue standard monitoring.");
    recommendations.push("Verify with follow-up citizen report if pollution persists.");
  }
  recommendations.push("All recommendations require officer review and approval before action.");

  return {
    risk_score: finalScore,
    risk_level,
    category: topCategory,
    evidence,
    recommendations,
    breakdown,
    disclaimer:
      "DEMO: This is a rule-based keyword classification system, not a trained machine-learning model. Scores are illustrative and do not represent verified environmental data.",
  };
}
