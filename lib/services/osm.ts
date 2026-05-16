import { getOsmSources } from "@/lib/db";

export interface OsmAttribution {
  source_risk_score: number;
  dominant_source_type: string;
  source_attribution: Record<string, number>;
  nearby_sources: Array<{
    name: string;
    type: string;
    distance_km: number;
    position_context: string;
    risk_contribution: number;
  }>;
  confidence: number;
  explanation: string;
}

export function getSourceAttribution(zoneId: string): OsmAttribution {
  const sources = getOsmSources(zoneId);

  if (sources.length === 0) {
    return {
      source_risk_score: 0.0,
      dominant_source_type: "unknown",
      source_attribution: { industrial: 0, domestic: 0, agricultural: 0 },
      nearby_sources: [],
      confidence: 0.0,
      explanation: "No OSM source attribution data available for this zone.",
    };
  }

  const totalRisk = sources.reduce((sum, s) => sum + (s.risk_contribution || 0), 0);

  // Count source types
  const typeCounts: Record<string, number> = {};
  sources.forEach((s) => {
    typeCounts[s.source_type] = (typeCounts[s.source_type] || 0) + s.risk_contribution;
  });

  const attribution: Record<string, number> = {};
  Object.entries(typeCounts).forEach(([type, count]) => {
    attribution[type] = parseFloat((count / Math.max(totalRisk, 1)).toFixed(2));
  });
  const dominantType =
    Object.entries(attribution).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

  const nearby = sources.map((s) => ({
    name: s.name,
    type: s.source_type,
    distance_km: s.distance_km,
    position_context: s.position_context,
    risk_contribution: s.risk_contribution,
  }));

  return {
    source_risk_score: parseFloat(Math.min(totalRisk, 1.0).toFixed(2)),
    dominant_source_type: dominantType,
    source_attribution: attribution,
    nearby_sources: nearby,
    confidence: nearby.length > 0 ? 0.7 : 0,
    explanation: `Likely ${dominantType} source risk from ${nearby.length} OSM feature(s) near this zone.`,
  };
}
