"use client";

import { useEffect, useRef } from "react";
import type { Zone } from "@/hooks/use-zones";

interface Props {
  zones: Zone[];
}

export default function CitizenRiverMap({ zones }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    async function initializeMap() {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (cancelled) return;

      map = L.map(container!).setView([13.08, 80.24], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // Approximate illustrative river paths for the demo map.
      // These are not official surveyed river boundaries.
      const rivers = [
        {
          name: "Adyar River",
          color: "#2563eb",
          points: [[13.04, 80.18], [13.02, 80.20], [13.01, 80.22], [13.00, 80.24], [12.99, 80.26], [12.98, 80.27]],
        },
        {
          name: "Cooum River",
          color: "#7c3aed",
          points: [[13.12, 80.10], [13.10, 80.15], [13.09, 80.20], [13.08, 80.24], [13.07, 80.27], [13.07, 80.29]],
        },
        {
          name: "Kosasthalaiyar River",
          color: "#0d9488",
          points: [[13.22, 80.15], [13.20, 80.18], [13.18, 80.22], [13.16, 80.25], [13.15, 80.28]],
        },
      ];

      rivers.forEach((river) => {
        L.polyline(river.points as [number, number][], {
          color: river.color,
          weight: 4,
          opacity: 0.85,
        })
          .addTo(map!)
          .bindTooltip(river.name, { sticky: true });
      });

      const colors: Record<string, string> = {
        critical: "#dc2626",
        high: "#ea580c",
        medium: "#ca8a04",
        low: "#16a34a",
      };

      const validZones = zones.filter(
        (zone) => Number.isFinite(zone.lat) && Number.isFinite(zone.lng)
      );

      validZones.forEach((zone) => {
        const color = colors[zone.risk_level] ?? "#16a34a";

        L.circleMarker([zone.lat, zone.lng], {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: color,
          fillOpacity: 0.9,
        })
          .addTo(map!)
          .bindPopup(
            `<strong>${zone.name}</strong><br/>River: ${zone.river_name}<br/>Risk: ${zone.risk_level} (${zone.risk_score}/100)`
          );
      });

      if (validZones.length > 1) {
        map.fitBounds(
          L.latLngBounds(validZones.map((z) => [z.lat, z.lng] as [number, number])),
          { padding: [25, 25], maxZoom: 13 }
        );
      } else if (validZones.length === 1) {
        map.setView([validZones[0].lat, validZones[0].lng], 10);
      }

      map.invalidateSize();
    }

    void initializeMap().catch(console.error);

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [zones]);

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <h2 className="font-bold text-slate-900">Chennai River Pollution Map</h2>
        <p className="mt-1 text-xs text-slate-500">
          Monitoring Adyar, Cooum &amp; Kosasthalaiyar rivers. Select a marker to view details.
        </p>
      </div>

      <div
        ref={mapRef}
        className="w-full bg-slate-100"
        style={{ height: 360 }}
        aria-label="Interactive river pollution map"
      />

      <div className="flex flex-wrap gap-4 border-t p-3 text-xs text-slate-600">
        {[
          ["#dc2626", "Critical"],
          ["#ea580c", "High"],
          ["#ca8a04", "Medium"],
          ["#16a34a", "Low"],
        ].map(([color, label]) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>

      <p className="px-3 pb-3 text-[11px] text-slate-400">
        Illustrative coordinates for demo purposes. Risk levels reflect project data, not live sensor readings.
      </p>
    </section>
  );
}


