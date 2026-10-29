"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useZones } from "@/hooks/use-zones";
import { useReports } from "@/hooks/use-reports";
import SidebarNav from "@/components/dashboard/sidebar-nav";
import type { Zone } from "@/hooks/use-zones";

const RISK_COLORS: Record<string, string> = {
  critical: "#e52020",
  high: "#ef9100",
  medium: "#f59e0b",
  low: "#22c55e",
};

// Illustrative Chennai river paths — NOT official surveyed boundaries
const CHENNAI_RIVERS = [
  {
    name: "Adyar River",
    color: "#2563eb",
    weight: 4,
    points: [[13.04, 80.18], [13.02, 80.20], [13.01, 80.22], [13.00, 80.24], [12.99, 80.26], [12.98, 80.27]] as [number, number][],
  },
  {
    name: "Cooum River",
    color: "#7c3aed",
    weight: 4,
    points: [[13.12, 80.10], [13.10, 80.15], [13.09, 80.20], [13.08, 80.24], [13.07, 80.27], [13.07, 80.29]] as [number, number][],
  },
  {
    name: "Kosasthalaiyar River",
    color: "#0d9488",
    weight: 4,
    points: [[13.22, 80.15], [13.20, 80.18], [13.18, 80.22], [13.16, 80.25], [13.15, 80.28]] as [number, number][],
  },
];

function MapView({ zones, reports, selectedZoneId, onSelectZone }: {
  zones: Zone[];
  reports: { id: string; zone_id: string; description: string; status: string; photo_ai_score: number; lat?: number; lng?: number }[];
  selectedZoneId: string | null;
  onSelectZone: (id: string) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [ready, setReady] = useState(false);

  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstance.current) return;
    const L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([13.08, 80.24], 12);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // Draw illustrative river paths
    CHENNAI_RIVERS.forEach((river) => {
      L.polyline(river.points, {
        color: river.color,
        weight: river.weight,
        opacity: 0.8,
      })
        .addTo(map)
        .bindTooltip(
          `<strong>${river.name}</strong><br/><span style="font-size:10px;opacity:0.7">Illustrative path — not surveyed</span>`,
          { sticky: true }
        );
    });

    // River labels
    CHENNAI_RIVERS.forEach((river) => {
      const mid = river.points[Math.floor(river.points.length / 2)];
      L.marker(mid, {
        icon: L.divIcon({
          className: "",
          html: `<span style="background:${river.color}22;color:${river.color};font-size:11px;font-weight:700;padding:2px 6px;border-radius:2px;border:1px solid ${river.color}44;white-space:nowrap">${river.name}</span>`,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(map);
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    mapInstance.current = map;
    setReady(true);
  }, []);

  useEffect(() => {
    initMap();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [initMap]);

  // Add/update zone markers
  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const L = (window as any).L;
    if (!L) {
      import("leaflet").then((leafletModule) => {
        const Leaflet = leafletModule.default;
        updateMarkers(Leaflet);
      });
    } else {
      updateMarkers(L);
    }

    function updateMarkers(L: any) {
      const map = mapInstance.current;
      const currentIds = new Set(zones.map((z) => z.id));
      Object.keys(markersRef.current).forEach((id) => {
        if (!currentIds.has(id)) {
          map.removeLayer(markersRef.current[id]);
          delete markersRef.current[id];
        }
      });

      zones.forEach((zone) => {
        if (!zone.lat || !zone.lng) return;
        const color = RISK_COLORS[zone.risk_level] ?? "#888";
        const isSelected = zone.id === selectedZoneId;
        const size = isSelected ? 18 : 12;

        const icon = L.divIcon({
          className: "",
          iconSize: [size + 8, size + 8],
          iconAnchor: [(size + 8) / 2, (size + 8) / 2],
          html: `<div style="position:relative;width:${size+8}px;height:${size+8}px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:${size+8}px;height:${size+8}px;border:2px solid ${color};border-radius:50%;opacity:0.4;animation:marker-ring-pulse 2s ease-in-out infinite;"></div>
            <div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid #ffffff88;box-shadow:0 0 8px ${color}80;z-index:1;"></div>
          </div>`,
        });

        if (markersRef.current[zone.id]) {
          markersRef.current[zone.id].setIcon(icon);
        } else {
          const marker = L.marker([zone.lat, zone.lng], { icon, interactive: true }).addTo(map);
          marker.bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:180px">
              <p style="font-weight:700;font-size:13px;margin:0 0 4px">${zone.name}</p>
              <p style="font-size:11px;color:#888;margin:0 0 6px">${zone.river_name} · ${zone.province}</p>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:20px;font-weight:700;color:${color}">${zone.risk_score}</span>
                <span style="background:${color}22;color:${color};font-size:10px;font-weight:700;padding:2px 6px;border-radius:2px;text-transform:uppercase">${zone.risk_level}</span>
              </div>
              <p style="font-size:10px;color:#888;margin:4px 0 0">Radius: ${zone.radius_km}km · Basin: ${zone.basin}</p>
            </div>
          `);
          marker.on("click", () => onSelectZone(zone.id));
          markersRef.current[zone.id] = marker;
        }
      });
    }
  }, [zones, ready, selectedZoneId, onSelectZone]);

  // Pan to selected zone
  useEffect(() => {
    if (!selectedZoneId || !mapInstance.current) return;
    const zone = zones.find((z) => z.id === selectedZoneId);
    if (zone) {
      mapInstance.current.setView([zone.lat, zone.lng], 14, { animate: true });
      markersRef.current[zone.id]?.openPopup();
    }
  }, [selectedZoneId, zones]);

  return <div ref={mapRef} className="h-full w-full" />;
}

export default function MapPage() {
  const { zones, loading: zonesLoading } = useZones(0);
  const { reports, loading: reportsLoading } = useReports();
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [filterRiver, setFilterRiver] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");

  const riverNames = Array.from(new Set(zones.map((z) => z.river_name)));

  const filteredZones = zones.filter((z) => {
    if (filterRiver !== "all" && z.river_name !== filterRiver) return false;
    if (filterSeverity !== "all" && z.risk_level !== filterSeverity) return false;
    return true;
  });

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;
  const zoneReports = reports.filter((r) => r.zone_id === selectedZoneId);

  return (
    <div className="flex h-screen bg-[#0a1628] overflow-hidden">
      <SidebarNav />

      <div className="flex-1 flex flex-col overflow-hidden mt-12 md:mt-0">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-[#1a2d4a] bg-[#0f1d32] px-6 py-3">
          <div>
            <h1 className="text-base font-bold text-white">Chennai River Map</h1>
            <p className="text-xs text-white/40">Adyar · Cooum · Kosasthalaiyar — Illustrative coordinates</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterRiver}
              onChange={(e) => setFilterRiver(e.target.value)}
              className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] px-2 py-1.5 text-xs text-white/70 outline-none"
            >
              <option value="all">All Rivers</option>
              {riverNames.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="rounded-sm bg-[#1a2d4a] border border-[#243b5e] px-2 py-1.5 text-xs text-white/70 outline-none"
            >
              <option value="all">All Severities</option>
              {["critical", "high", "medium", "low"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Map area */}
          <div className="flex-1 relative">
            {(zonesLoading || reportsLoading) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a1628]/80">
                <div className="text-center text-white/60">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0d9488] border-t-transparent mx-auto" />
                  <p className="mt-2 text-sm">Loading map data…</p>
                </div>
              </div>
            )}
            <MapView
              zones={filteredZones}
              reports={reports.map((r) => ({ ...r, lat: r.lat, lng: r.lng }))}
              selectedZoneId={selectedZoneId}
              onSelectZone={setSelectedZoneId}
            />

            {/* Legend */}
            <div className="absolute bottom-4 left-4 z-[400] rounded-sm bg-[#0a1628]/90 border border-[#1a2d4a] px-3 py-2 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Risk Level</p>
              {Object.entries(RISK_COLORS).map(([level, color]) => (
                <div key={level} className="flex items-center gap-2 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-white/60 capitalize">{level}</span>
                </div>
              ))}
              <div className="mt-2 border-t border-[#1a2d4a] pt-2 space-y-0.5">
                {CHENNAI_RIVERS.map((r) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="h-0.5 w-4" style={{ backgroundColor: r.color, display: "inline-block" }} />
                    <span className="text-[10px] text-white/50">{r.name}</span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[9px] text-white/25">Illustrative coordinates · Demo only</p>
            </div>
          </div>

          {/* Side panel */}
          {selectedZone && (
            <div className="w-72 shrink-0 border-l border-[#1a2d4a] bg-[#0f1d32] overflow-y-auto">
              <div className="p-4 border-b border-[#1a2d4a]">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedZone.name}</h3>
                    <p className="text-xs text-white/40 mt-0.5">{selectedZone.river_name}</p>
                  </div>
                  <button onClick={() => setSelectedZoneId(null)} className="text-white/30 hover:text-white text-lg leading-none">&times;</button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-2xl font-bold" style={{ color: RISK_COLORS[selectedZone.risk_level] }}>
                    {selectedZone.risk_score}
                  </span>
                  <span
                    className="rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase"
                    style={{ backgroundColor: `${RISK_COLORS[selectedZone.risk_level]}20`, color: RISK_COLORS[selectedZone.risk_level] }}
                  >
                    {selectedZone.risk_level}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["Province", selectedZone.province],
                    ["Basin", selectedZone.basin],
                    ["Radius", `${selectedZone.radius_km} km`],
                    ["Reports", zoneReports.length.toString()],
                  ].map(([label, val]) => (
                    <div key={label} className="rounded-sm bg-[#1a2d4a] p-2">
                      <p className="text-[10px] text-white/30 uppercase tracking-wide">{label}</p>
                      <p className="text-xs font-bold text-white mt-0.5 truncate">{val}</p>
                    </div>
                  ))}
                </div>
                {zoneReports.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Recent Reports</p>
                    <div className="space-y-1.5">
                      {zoneReports.slice(0, 4).map((r) => (
                        <div key={r.id} className="rounded-sm bg-[#1a2d4a] px-3 py-2">
                          <p className="text-xs text-white/70 truncate">{r.description || "No description"}</p>
                          <p className="text-[10px] text-white/30 mt-0.5">
                            {r.status} · AI {Math.round(r.photo_ai_score * 100)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Zone list sidebar (no selection) */}
          {!selectedZone && (
            <div className="w-60 shrink-0 border-l border-[#1a2d4a] bg-[#0f1d32] overflow-y-auto">
              <div className="px-4 py-3 border-b border-[#1a2d4a]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Zones ({filteredZones.length})</p>
              </div>
              <div className="divide-y divide-[#1a2d4a]">
                {filteredZones.sort((a, b) => b.risk_score - a.risk_score).map((z) => (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZoneId(z.id)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-[#1a2d4a] transition-colors"
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: RISK_COLORS[z.risk_level] }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-white">{z.name}</p>
                      <p className="text-[10px] text-white/30 truncate">{z.river_name}</p>
                    </div>
                    <span className="text-xs font-bold shrink-0" style={{ color: RISK_COLORS[z.risk_level] }}>{z.risk_score}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
