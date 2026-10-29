import fs from "fs";
import path from "path";

// Simple file-based JSON database for MVP
// Loads seed data on first run, persists to data/db.json

const DB_PATH = path.join(process.cwd(), "data", "db.json");

// Types
export interface Zone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_km: number;
  river_name: string;
  province: string;
  basin: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  created_at: string;
  updated_at: string;
}

export interface CitizenReport {
  id: string;
  zone_id: string;
  citizen_id: string;
  photo_url: string;
  lat: number;
  lng: number;
  description: string;
  status: "pending" | "verified" | "rejected";
  points_awarded: number;
  photo_ai_score: number;
  ai_analysis: Record<string, unknown>;
  created_at: string;
}

export interface Citizen {
  id: string;
  display_name: string;
  total_points: number;
  tier: "bronze" | "silver" | "gold";
  created_at: string;
  user_id?: string;
}

export interface InspectorAction {
  id: string;
  zone_id: string;
  inspector_id: string;
  action: string;
  notes: string;
  resolved_at: string;
}

export interface SatelliteObservation {
  id: string;
  zone_id: string;
  source: string;
  ndwi: number;
  mndwi: number;
  turbidity_proxy: number;
  historical_mean?: number;
  historical_std?: number;
  latest_value?: number;
  cloud_percentage: number;
  valid_pixel_ratio: number;
  quality_status: string;
  confidence: number;
  captured_at: string;
}

export interface SatelliteAnomaly {
  id: string;
  zone_id: string;
  observation_id: string;
  z_score: number;
  anomaly_score: number;
  anomaly_level: string;
  confidence: number;
  historical_mean?: number;
  historical_std?: number;
  latest_value?: number;
  explanation: string;
  created_at: string;
}

export interface OsmSource {
  id: string;
  zone_id: string;
  source_type: string;
  name: string;
  distance_km: number;
  position_context: string;
  risk_contribution: number;
  osm_id: string;
}

export interface DbSchema {
  zones: Zone[];
  citizen_reports: CitizenReport[];
  citizens: Citizen[];
  inspector_actions: InspectorAction[];
  satellite_observations: SatelliteObservation[];
  satellite_anomalies: SatelliteAnomaly[];
  osm_sources: OsmSource[];
}

function loadSeed<T>(filename: string): T[] {
  const p = path.join(process.cwd(), "data", filename);
  if (!fs.existsSync(p)) return [];
  return JSON.parse(fs.readFileSync(p, "utf-8")) as T[];
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function initDb(): DbSchema {
  const seedZones = loadSeed<{
    zone_id: string;
    name: string;
    river_name: string;
    province: string;
    lat: number;
    lng: number;
    radius_km: number;
    basin: string;
  }>("seed_zones.json");

  const seedSat = loadSeed<{
    zone_id: string;
    source: string;
    ndwi: number;
    mndwi: number;
    turbidity_proxy: number;
    historical_mean?: number;
    historical_std?: number;
    latest_value?: number;
    z_score?: number;
    anomaly_score?: number;
    anomaly_level?: string;
    explanation?: string;
    cloud_percentage: number;
    valid_pixel_ratio: number;
    quality_status: string;
    confidence: number;
    captured_at: string;
  }>("seed_satellite_readings.json");

  const seedOsm = loadSeed<{
    zone_id: string;
    source_risk_score: number;
    dominant_source_type: string;
    source_attribution: Record<string, number>;
    nearby_sources: Array<{
      name: string;
      type: string;
      distance_km: number;
      position_context: string;
      risk_contribution: number;
      osm_id?: string;
    }>;
    confidence: number;
    explanation: string;
  }>("seed_osm_sources.json");

  const seedCitizens = loadSeed<Citizen>("seed_citizens.json");
  const seedReports = loadSeed<CitizenReport>("seed_reports.json");
  const seedInspectorActions = loadSeed<InspectorAction>("seed_inspector_actions.json");

  const zones: Zone[] = seedZones.map((z) => ({
    id: z.zone_id,
    name: z.name,
    lat: z.lat,
    lng: z.lng,
    radius_km: z.radius_km,
    river_name: z.river_name,
    province: z.province,
    basin: z.basin,
    risk_score: 0,
    risk_level: "low",
    created_at: nowIso(),
    updated_at: nowIso(),
  }));

  const satellite_observations: SatelliteObservation[] = seedSat.map(
    (s, idx) => ({
      id: `sat_obs_${idx}`,
      zone_id: s.zone_id,
      source: s.source,
      ndwi: s.ndwi,
      mndwi: s.mndwi,
      turbidity_proxy: s.turbidity_proxy,
      historical_mean: s.historical_mean,
      historical_std: s.historical_std,
      latest_value: s.latest_value,
      cloud_percentage: s.cloud_percentage,
      valid_pixel_ratio: s.valid_pixel_ratio,
      quality_status: s.quality_status,
      confidence: s.confidence,
      captured_at: s.captured_at,
    }),
  );

  const satellite_anomalies: SatelliteAnomaly[] = seedSat.map((s, idx) => {
    const historicalMean = s.historical_mean ?? 0.5;
    const historicalStd = s.historical_std && s.historical_std > 0 ? s.historical_std : 0.15;
    const latestValue = s.latest_value ?? s.turbidity_proxy;
    const zScore = s.z_score ?? (latestValue - historicalMean) / historicalStd;
    const anomalyScore = s.anomaly_score ?? Math.max(0, Math.min(1, Math.abs(zScore) / 3));
    let anomalyLevel = s.anomaly_level ?? "low";
    if (!s.anomaly_level) {
      if (anomalyScore > 0.85) anomalyLevel = "critical";
      else if (anomalyScore > 0.6) anomalyLevel = "high";
      else if (anomalyScore > 0.3) anomalyLevel = "medium";
    }

    return {
      id: `sat_anom_${idx}`,
      zone_id: s.zone_id,
      observation_id: `sat_obs_${idx}`,
      z_score: parseFloat(zScore.toFixed(2)),
      anomaly_score: parseFloat(anomalyScore.toFixed(3)),
      anomaly_level: anomalyLevel,
      confidence: s.confidence,
      historical_mean: s.historical_mean,
      historical_std: s.historical_std,
      latest_value: s.latest_value,
      explanation:
        s.explanation ??
        `Turbidity proxy is ${zScore.toFixed(1)} standard deviations from baseline.`,
      created_at: s.captured_at,
    };
  });

  const osm_sources: OsmSource[] = seedOsm.flatMap((o, idx) => {
    return o.nearby_sources.map((src, sIdx) => ({
      id: `osm_${idx}_${sIdx}`,
      zone_id: o.zone_id,
      source_type: src.type,
      name: src.name,
      distance_km: src.distance_km,
      position_context: src.position_context,
      risk_contribution: src.risk_contribution,
      osm_id: src.osm_id ?? `osm_${idx}_${sIdx}`,
    }));
  });

  const citizens: Citizen[] =
    seedCitizens.length > 0
      ? seedCitizens
      : [
          {
            id: "citizen_01",
            display_name: "Chennai Citizen",
            total_points: 120,
            tier: "silver",
            created_at: nowIso(),
          },
        ];

  const citizen_reports: CitizenReport[] =
    seedReports.length > 0
      ? seedReports
      : [
          {
            id: "report_01",
            zone_id: "adyar_river_01",
            citizen_id: "citizen_01",
            photo_url:
              "https://images.unsplash.com/photo-1611273426858-4502b0f3c2c5?auto=format&fit=crop&w=1200&q=80",
            lat: 13.0067,
            lng: 80.2206,
            description: "Foam patches spotted along Adyar River after rain.",
            status: "verified",
            points_awarded: 10,
            photo_ai_score: 0.61,
            ai_analysis: {
              is_water_scene: true,
              floating_trash: true,
              turbid_water: true,
              severity_level: "high",
            },
            created_at: nowIso(),
          },
        ];

  return {
    zones,
    citizen_reports,
    citizens,
    inspector_actions: seedInspectorActions,
    satellite_observations,
    satellite_anomalies,
    osm_sources,
  };
}

function loadDb(): DbSchema {
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as Partial<DbSchema>;
      const normalized: DbSchema = {
        zones: ensureArray(raw.zones),
        citizen_reports: ensureArray(raw.citizen_reports),
        citizens: ensureArray(raw.citizens),
        inspector_actions: ensureArray(raw.inspector_actions),
        satellite_observations: ensureArray(raw.satellite_observations),
        satellite_anomalies: ensureArray(raw.satellite_anomalies),
        osm_sources: ensureArray(raw.osm_sources),
      };
      return normalized;
    } catch {
      // corrupted, re-init
    }
  }
  const db = initDb();
  saveDb(db);
  return db;
}

function saveDb(db: DbSchema) {
  try {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch {
    // ignore write errors in read-only environments
  }
}

function ensureArray<T>(value: T[] | T | undefined | null): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

let _db: DbSchema | null = null;
let _dbMtime: number = 0;

function getDb(): DbSchema {
  // Always check if the on-disk file is newer (handles multi-worker dev servers)
  try {
    const stat = fs.statSync(DB_PATH);
    const mtime = stat.mtimeMs;
    if (!_db || mtime > _dbMtime) {
      _db = loadDb();
      _dbMtime = mtime;
    }
  } catch {
    if (!_db) {
      _db = loadDb();
    }
  }
  return _db;
}

function persist() {
  if (_db) {
    saveDb(_db);
    // Update mtime tracker so this worker knows the file is current
    try { _dbMtime = fs.statSync(DB_PATH).mtimeMs; } catch { /* noop */ }
  }
}

// Zone operations
export function getZones(): Zone[] {
  return getDb().zones;
}

export function getZoneById(id: string): Zone | undefined {
  return getDb().zones.find((z) => z.id === id);
}

export function updateZone(id: string, updates: Partial<Zone>): Zone | undefined {
  const db = getDb();
  const idx = db.zones.findIndex((z) => z.id === id);
  if (idx === -1) return undefined;
  db.zones[idx] = { ...db.zones[idx], ...updates, updated_at: nowIso() };
  persist();
  return db.zones[idx];
}

// Report operations
export function getReports(filters?: { zone_id?: string; status?: string }): CitizenReport[] {
  let reports = getDb().citizen_reports;
  if (filters?.zone_id) reports = reports.filter((r) => r.zone_id === filters.zone_id);
  if (filters?.status) reports = reports.filter((r) => r.status === filters.status);
  return reports.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getReportById(id: string): CitizenReport | undefined {
  return getDb().citizen_reports.find((r) => r.id === id);
}

export function createReport(data: Omit<CitizenReport, "id" | "created_at">): CitizenReport {
  const db = getDb();
  const report: CitizenReport = {
    ...data,
    id: generateId("report"),
    created_at: nowIso(),
  };
  db.citizen_reports.push(report);
  persist();
  return report;
}

export function updateReport(id: string, updates: Partial<CitizenReport>): CitizenReport | undefined {
  const db = getDb();
  const idx = db.citizen_reports.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  db.citizen_reports[idx] = { ...db.citizen_reports[idx], ...updates };
  persist();
  return db.citizen_reports[idx];
}

// Citizen operations
export function getCitizens(): Citizen[] {
  return getDb().citizens;
}

export function getCitizenById(id: string): Citizen | undefined {
  return getDb().citizens.find((c) => c.id === id);
}

export function getCitizenByUserId(userId: string): Citizen | undefined {
  return getDb().citizens.find((c) => c.user_id === userId);
}

export function getOrCreateCitizenByUserId(
  userId: string,
  displayName: string,
): Citizen {
  const existing = getCitizenByUserId(userId);
  if (existing) return existing;
  const db = getDb();
  const citizen: Citizen = {
    id: userId,
    user_id: userId,
    display_name: displayName,
    total_points: 0,
    tier: "bronze",
    created_at: nowIso(),
  };
  db.citizens.push(citizen);
  persist();
  return citizen;
}

export function updateCitizen(id: string, updates: Partial<Citizen>): Citizen | undefined {
  const db = getDb();
  const idx = db.citizens.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  db.citizens[idx] = { ...db.citizens[idx], ...updates };
  persist();
  return db.citizens[idx];
}

export function createCitizen(data: Omit<Citizen, "id" | "created_at">): Citizen {
  const db = getDb();
  const citizen: Citizen = {
    ...data,
    id: generateId("citizen"),
    created_at: nowIso(),
  };
  db.citizens.push(citizen);
  persist();
  return citizen;
}

// Inspector actions
export function getInspectorActions(zoneId?: string): InspectorAction[] {
  const actions = getDb().inspector_actions;
  if (zoneId) return actions.filter((a) => a.zone_id === zoneId);
  return actions;
}

export function createInspectorAction(data: Omit<InspectorAction, "id">): InspectorAction {
  const db = getDb();
  const action: InspectorAction = {
    ...data,
    id: generateId("inspector"),
  };
  db.inspector_actions.push(action);
  persist();
  return action;
}

// Satellite operations
export function getSatelliteAnomalies(zoneId?: string): SatelliteAnomaly[] {
  const anomalies = getDb().satellite_anomalies;
  if (zoneId) return anomalies.filter((a) => a.zone_id === zoneId);
  return anomalies;
}

export function getSatelliteObservations(zoneId?: string): SatelliteObservation[] {
  const obs = getDb().satellite_observations;
  if (zoneId) return obs.filter((o) => o.zone_id === zoneId);
  return obs;
}

// OSM operations
export function getOsmSources(zoneId?: string): OsmSource[] {
  const sources = getDb().osm_sources;
  if (zoneId) return sources.filter((s) => s.zone_id === zoneId);
  return sources;
}

// Leaderboard
export function getLeaderboard(limit = 10): Citizen[] {
  return getDb()
    .citizens.slice()
    .filter((c) => c && typeof c.id === "string" && c.id.length > 0)
    .map((c) => ({
      ...c,
      display_name:
        typeof c.display_name === "string" && c.display_name.trim().length > 0
          ? c.display_name
          : "Anonymous Citizen",
      total_points:
        typeof c.total_points === "number" && Number.isFinite(c.total_points)
          ? c.total_points
          : 0,
      tier:
        c.tier === "gold" || c.tier === "silver" || c.tier === "bronze"
          ? c.tier
          : "bronze",
      created_at:
        typeof c.created_at === "string" && c.created_at.length > 0
          ? c.created_at
          : nowIso(),
    }))
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, limit);
}
