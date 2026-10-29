"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Zone } from "@/hooks/use-zones";

interface MapProps {
  zones: Zone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

function riskColor(level: string) {
  switch (level) {
    case "critical":
      return "#e52020";
    case "high":
      return "#df6500";
    case "medium":
      return "#ef9100";
    default:
      return "#3f8500";
  }
}

export default function ZoneMap({ zones, selectedZoneId, onSelectZone }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const initializingRef = useRef(false);
  const markersRef = useRef<Record<string, any>>({});
  const lastCenteredZoneIdRef = useRef<string | null>(null);
  const [mapReadyKey, setMapReadyKey] = useState(0);

  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstance.current || initializingRef.current) return;
    initializingRef.current = true;
    const container = mapRef.current;
    const L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");

    if (!mapRef.current || mapInstance.current) {
      initializingRef.current = false;
      return;
    }

    const map = L.map(container, {
      zoomControl: false,
    }).setView([20.5937, 78.9629], 5);

    // Base layers
    const cartoLight = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    );

    const osm = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    );

    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution:
          '&copy; <a href="https://www.esri.com/">Esri</a> - Esri, DeLorme, NAVTEQ',
        maxZoom: 18,
      },
    );

    const darkMatter = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      },
    );

    const terrain = L.tileLayer(
      "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> - Map data: &copy; OpenStreetMap contributors, SRTM',
        maxZoom: 17,
      },
    );

    cartoLight.addTo(map);

    const baseLayers = {
      Light: cartoLight,
      Street: osm,
      Satellite: satellite,
      Dark: darkMatter,
      Terrain: terrain,
    };

    L.control
      .layers(baseLayers, undefined, {
        position: "topright",
        collapsed: true,
      })
      .addTo(map);

    L.control
      .zoom({
        position: "bottomright",
      })
      .addTo(map);

    mapInstance.current = map;
    initializingRef.current = false;
    setMapReadyKey((k) => k + 1);
  }, []);

  useEffect(() => {
    initMap();
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
      initializingRef.current = false;
      markersRef.current = {};
    };
  }, [initMap]);

  // Add/update markers
  useEffect(() => {
    if (!mapInstance.current) return;

    const addMarkers = async () => {
      const L = (await import("leaflet")).default;
      const map = mapInstance.current;

      // Remove old markers not in current zones
      const currentIds = new Set(zones.map((z) => z.id));
      Object.keys(markersRef.current).forEach((id) => {
        if (!currentIds.has(id)) {
          map.removeLayer(markersRef.current[id]);
          delete markersRef.current[id];
        }
      });

      zones.forEach((zone) => {
        const color = riskColor(zone.risk_level);
        const isSelected = zone.id === selectedZoneId;
        const size = isSelected ? 28 : 20;

        if (markersRef.current[zone.id]) {
          // Update existing marker position and selected state
          const existing = markersRef.current[zone.id];
          existing.setLatLng([zone.lat, zone.lng]);
          const el = existing.getElement();
          if (el) {
            const dot = el.querySelector(".marker-dot") as HTMLElement;
            if (dot) {
              dot.style.width = `${size}px`;
              dot.style.height = `${size}px`;
              dot.style.backgroundColor = color;
            }
            const ring = el.querySelector(".marker-ring") as HTMLElement;
            if (ring) {
              ring.style.width = `${size + 8}px`;
              ring.style.height = `${size + 8}px`;
              ring.style.borderColor = color;
            }
          }
        } else {
          const icon = L.divIcon({
            className: "",
            iconSize: [size + 8, size + 8],
            iconAnchor: [(size + 8) / 2, (size + 8) / 2],
            html: `
              <div class="marker-container" style="position:relative;width:${size + 8}px;height:${size + 8}px;display:flex;align-items:center;justify-content:center;">
                <div class="marker-ring" style="
                  position:absolute;
                  width:${size + 8}px;
                  height:${size + 8}px;
                  border:2px solid ${color};
                  border-radius:50%;
                  opacity:0.3;
                  animation: marker-ring-pulse 2s ease-in-out infinite;
                "></div>
                <div class="marker-dot" style="
                  position:relative;
                  width:${size}px;
                  height:${size}px;
                  background:${color};
                  border-radius:50%;
                  border:2px solid #ffffff;
                  box-shadow:0 0 8px ${color}80;
                  animation: marker-dot-twitch 2s ease-in-out infinite;
                  z-index:1;
                "></div>
              </div>
            `,
          });

          const marker = L.marker([zone.lat, zone.lng], {
            icon,
            interactive: true,
          }).addTo(map);

          marker.bindPopup(
            `<div style="font-family:Inter,sans-serif;font-size:13px">
              <strong>${zone.name}</strong><br/>
              Risk: ${zone.risk_score}/100 (${zone.risk_level})
            </div>`,
          );

          marker.on("click", () => {
            onSelectZone(zone.id);
          });

          markersRef.current[zone.id] = marker;
        }
      });
    };

    addMarkers();
  }, [zones, selectedZoneId, mapReadyKey, onSelectZone]);

  // Pan to selected zone
  useEffect(() => {
    if (!selectedZoneId) {
      lastCenteredZoneIdRef.current = null;
      return;
    }

    if (!mapInstance.current) return;
    if (lastCenteredZoneIdRef.current === selectedZoneId) return;

    const zone = zones.find((z) => z.id === selectedZoneId);
    if (zone) {
      mapInstance.current.setView([zone.lat, zone.lng], 12, { animate: false });
      lastCenteredZoneIdRef.current = selectedZoneId;
    }
  }, [selectedZoneId, zones]);

  return <div ref={mapRef} className="h-full w-full min-h-[400px]" />;
}

