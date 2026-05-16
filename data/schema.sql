-- WAVE Supabase Database Schema
-- Run this in your Supabase SQL Editor to create tables

-- Zones (monitored river segments)
CREATE TABLE IF NOT EXISTS zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION NOT NULL,
    river_name TEXT NOT NULL,
    province TEXT NOT NULL,
    basin TEXT NOT NULL,
    risk_score INTEGER DEFAULT 0,
    risk_level TEXT DEFAULT 'low',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Citizen reports (photo submissions)
CREATE TABLE IF NOT EXISTS citizen_reports (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zone_id TEXT REFERENCES zones(id) ON DELETE CASCADE,
    citizen_id TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    description TEXT,
    status TEXT DEFAULT 'pending',
    points_awarded INTEGER DEFAULT 0,
    photo_ai_score DOUBLE PRECISION,
    ai_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Citizens (reporters)
CREATE TABLE IF NOT EXISTS citizens (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    total_points INTEGER DEFAULT 0,
    tier TEXT DEFAULT 'bronze',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inspector actions
CREATE TABLE IF NOT EXISTS inspector_actions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zone_id TEXT REFERENCES zones(id) ON DELETE CASCADE,
    inspector_id TEXT NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    resolved_at TIMESTAMPTZ DEFAULT now()
);

-- Satellite observations
CREATE TABLE IF NOT EXISTS satellite_observations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zone_id TEXT REFERENCES zones(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    ndwi DOUBLE PRECISION,
    mndwi DOUBLE PRECISION,
    turbidity_proxy DOUBLE PRECISION,
    cloud_percentage DOUBLE PRECISION,
    valid_pixel_ratio DOUBLE PRECISION,
    quality_status TEXT,
    confidence DOUBLE PRECISION,
    captured_at TIMESTAMPTZ
);

-- Satellite anomalies
CREATE TABLE IF NOT EXISTS satellite_anomalies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zone_id TEXT REFERENCES zones(id) ON DELETE CASCADE,
    observation_id TEXT REFERENCES satellite_observations(id) ON DELETE CASCADE,
    z_score DOUBLE PRECISION,
    anomaly_score DOUBLE PRECISION,
    anomaly_level TEXT,
    confidence DOUBLE PRECISION,
    explanation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- OSM pollution sources
CREATE TABLE IF NOT EXISTS osm_sources (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    zone_id TEXT REFERENCES zones(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    name TEXT,
    distance_km DOUBLE PRECISION,
    position_context TEXT,
    risk_contribution DOUBLE PRECISION,
    osm_id TEXT
);

-- Enable Row Level Security (optional, for production)
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizen_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspector_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE satellite_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE osm_sources ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust for your auth setup)
CREATE POLICY "Public read zones" ON zones FOR SELECT USING (true);
CREATE POLICY "Public read reports" ON citizen_reports FOR SELECT USING (true);
CREATE POLICY "Public read citizens" ON citizens FOR SELECT USING (true);
CREATE POLICY "Public read inspector actions" ON inspector_actions FOR SELECT USING (true);
CREATE POLICY "Public read satellite" ON satellite_observations FOR SELECT USING (true);
CREATE POLICY "Public read anomalies" ON satellite_anomalies FOR SELECT USING (true);
CREATE POLICY "Public read osm" ON osm_sources FOR SELECT USING (true);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_reports_zone_id ON citizen_reports(zone_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_inspector_zone_id ON inspector_actions(zone_id);
CREATE INDEX IF NOT EXISTS idx_sat_obs_zone_id ON satellite_observations(zone_id);
CREATE INDEX IF NOT EXISTS idx_sat_anom_zone_id ON satellite_anomalies(zone_id);
CREATE INDEX IF NOT EXISTS idx_osm_zone_id ON osm_sources(zone_id);
