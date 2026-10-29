
"use client";

import { useEffect, useRef } from "react";
import type { Zone } from "@/hooks/use-zones";

interface CitizenRiverMapProps {
  zones: Zone[];
}

export default function CitizenRiverMap({
  zones,
}: CitizenRiverMapProps) {
  const mapElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mapElement.current;
    if (!container) return;

    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    async function initializeMap() {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      if (cancelled || !container) return;

      map = L.map(container, {
        scrollWheelZoom: true,
      }).setView([20.5937, 78.9629], 5);

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18,
        },
      ).addTo(map);

      const riskColors: Record<string, string> = {
        critical: "#e52020",
        high: "#df6500",
        medium: "#ef9100",
        low: "#3f8500",
      };

      zones.forEach((zone) => {
        if (
          !Number.isFinite(zone.lat) ||
          !Number.isFinite(zone.lng)
        ) {
          return;
        }

        const color = riskColors[zone.risk_level] ?? "#3f8500";

        const marker = L.circleMarker([zone.lat, zone.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map!);

        const popup = document.createElement("div");
        popup.style.minWidth = "150px";

        const title = document.createElement("strong");
        title.textContent = zone.name;

        const risk = document.createElement("p");
        risk.textContent =
          `Risk: ${zone.risk_level} (${zone.risk_score}/100)`;

        const reportLink = document.createElement("a");
        reportLink.href =
          `/citizen/report?zone=${encodeURIComponent(zone.id)}`;
        reportLink.textContent = "Report pollution";
        reportLink.style.color = "#287a35";
        reportLink.style.fontWeight = "600";

        popup.append(title, risk, reportLink);
        marker.bindPopup(popup);
      });

      if (zones.length > 0) {
        const validZones = zones.filter(
          (zone) =>
            Number.isFinite(zone.lat) &&
            Number.isFinite(zone.lng),
        );

        if (validZones.length > 1) {
          const bounds = L.latLngBounds(
            validZones.map((zone) => [zone.lat, zone.lng] as [number, number]),
          );
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
        } else if (validZones.length === 1) {
          map.setView(
            [validZones[0].lat, validZones[0].lng],
            10,
          );
        }
      }

      setTimeout(() => map?.invalidateSize(), 100);
    }

    void initializeMap();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [zones]);

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <h2 className="font-bold text-slate-900">
            India River Pollution Map
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Select a marker to view a monitored river zone.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {zones.length} zones
        </span>
      </div>

      <div
        ref={mapElement}
        className="h-[360px] w-full bg-slate-100"
        aria-label="Interactive map of monitored river pollution zones in India"
      />

      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-slate-100 p-3">
        {[
          { color: "#e52020", label: "Critical" },
          { color: "#df6500", label: "High" },
          { color: "#ef9100", label: "Medium" },
          { color: "#3f8500", label: "Low" },
        ].map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-1.5 text-xs text-slate-600"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <p className="px-3 pb-3 text-[11px] text-slate-400">
        Map: OpenStreetMap. Risk levels use the project API data and are not
        live sensor measurements.
      </p>
    </section>
  );
}
