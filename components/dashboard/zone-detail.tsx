"use client";

import { useState } from "react";
import type { Zone } from "@/hooks/use-zones";
import { useReports } from "@/hooks/use-reports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ZoneDetailProps {
  zone: Zone | null;
  onInspect: (zoneId: string) => void;
}

function RiskProgress({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-foreground font-bold">{label}</span>
        <span className="text-muted-foreground">
          {value.toFixed(0)} / {max}
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-sm border p-2.5 text-center">
      <p className="text-muted-foreground text-[10px] font-bold tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

export default function ZoneDetail({ zone, onInspect }: ZoneDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [inspecting, setInspecting] = useState(false);
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const { reports } = useReports(zone?.id);

  if (!zone) {
    return (
      <div className="bg-background flex h-full items-center justify-center border-t">
        <div className="text-center">
          <AlertTriangle className="text-muted-foreground/50 mx-auto h-8 w-8" />
          <p className="text-muted-foreground mt-2 text-sm">
            Select a zone to view details
          </p>
        </div>
      </div>
    );
  }

  const handleInspect = async () => {
    setInspecting(true);
    try {
      await fetch(`/api/v1/inspector/${zone.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspector_id: "inspector_01", notes: "" }),
      });
      onInspect(zone.id);
    } finally {
      setInspecting(false);
    }
  };

  const riskVariant =
    zone.risk_level === "critical"
      ? "destructive"
      : zone.risk_level === "high"
        ? "warning"
        : zone.risk_level === "medium"
          ? "secondary"
          : "default";

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "satellite", label: "Satellite" },
    { key: "sources", label: "Sources" },
    { key: "photos", label: "Photos" },
    { key: "reports", label: "Reports" },
  ];

  return (
    <div className="bg-background flex h-full flex-col border-t">
      {/* Header */}
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold">{zone.name}</h3>
            <p className="text-muted-foreground text-xs">
              {zone.province} - {zone.river_name}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl leading-none font-bold">{zone.risk_score}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge
                variant={riskVariant as any}
                className="text-[10px] uppercase"
              >
                {zone.risk_level}
              </Badge>
              <span className="text-muted-foreground text-[10px]">/100</span>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabs - horizontal scrollable */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="px-4 pt-2">
          <div className="w-full overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide">
            <TabsList
              variant="line"
              className="inline-flex h-8 w-auto"
            >
              {tabs.map((t) => (
                <TabsTrigger key={t.key} value={t.key} className="px-3 text-xs">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <TabsContent value="overview" className="m-0 p-4">
              <div className="space-y-5">
                <div className="space-y-3">
                  <h4 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
                    Risk Score Breakdown
                  </h4>
                  <RiskProgress
                    label="Satellite Anomaly"
                    value={zone.risk_score * 0.3}
                    max={30}
                  />
                  <RiskProgress
                    label="Source Attribution"
                    value={zone.risk_score * 0.2}
                    max={20}
                  />
                  <RiskProgress
                    label="Photo AI"
                    value={zone.risk_score * 0.25}
                    max={25}
                  />
                  <RiskProgress
                    label="Citizen Reports"
                    value={zone.risk_score * 0.15}
                    max={15}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Radius" value={`${zone.radius_km} km`} />
                  <StatCard label="Basin" value={zone.basin} />
                </div>

                <Button
                  onClick={handleInspect}
                  disabled={inspecting}
                  className="w-full bg-[#76b900] text-black hover:bg-[#5a8d00]"
                >
                  {inspecting ? "Marking..." : "Mark as Inspected"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="satellite" className="m-0 p-4">
              <div className="space-y-4">
                <p className="text-muted-foreground text-xs">
                  Source: Sentinel-2 / GEE
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="NDWI" value="0.21" />
                  <StatCard label="MNDWI" value="0.18" />
                  <StatCard label="Turbidity" value="0.78" />
                </div>
                <p className="text-foreground text-sm">
                  Turbidity proxy is 2.4 standard deviations above this
                  zone&apos;s baseline.
                </p>
                <div className="text-muted-foreground space-y-1 text-xs">
                  <p>Quality: Good | Confidence: 76%</p>
                  <p>Captured: 2026-05-15</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sources" className="m-0 p-4">
              <div className="space-y-4">
                <p className="text-foreground text-sm font-bold">
                  Dominant: Industrial (65%)
                </p>
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-sm border p-3">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">
                        Binh Duong Industrial Zone
                      </p>
                      <p className="text-muted-foreground text-xs">
                        0.7km upstream +0.31
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-sm border p-3">
                    <MapPin className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-bold">Wastewater Plant B</p>
                      <p className="text-muted-foreground text-xs">
                        1.4km upstream +0.24
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">Confidence: 74%</p>
              </div>
            </TabsContent>

            <TabsContent value="photos" className="m-0 p-4">
              <div className="grid grid-cols-3 gap-2">
                {reports
                  .filter((r) => r.photo_url)
                  .map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setPhotoModal(r.photo_url)}
                      className="group relative aspect-square overflow-hidden rounded-sm border bg-[#f7f7f7] text-left focus:outline-none focus:ring-2 focus:ring-[#76b900]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={r.photo_url}
                        alt="Citizen report"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                        <p className="text-[10px] font-bold text-white">
                          AI {(r.photo_ai_score * 100).toFixed(0)}%
                        </p>
                      </div>
                    </button>
                  ))}
                {reports.filter((r) => r.photo_url).length === 0 && (
                  <p className="text-muted-foreground col-span-3 py-8 text-center text-sm">
                    No photos yet
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="reports" className="m-0 p-4">
              <div className="space-y-4">
                <Badge variant="outline" className="text-xs">
                  {reports.length} report{reports.length !== 1 ? "s" : ""} in
                  last 30 days
                </Badge>
                <div className="space-y-2">
                  {reports.map((r) => (
                    <div
                      key={r.id}
                      className="bg-muted/30 rounded-sm border p-3"
                    >
                      <p className="text-foreground text-sm">
                        {r.description || "No description"}
                      </p>
                      <div className="text-muted-foreground mt-1.5 flex items-center gap-2 text-xs">
                        <span>
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{r.points_awarded} pts</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px]">
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No reports for this zone
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </div>
      </Tabs>

      {/* Photo lightbox */}
      {photoModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPhotoModal(null)}
        >
          <button
            onClick={() => setPhotoModal(null)}
            className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photoModal}
            alt="Citizen report full size"
            className="max-h-[85vh] max-w-full rounded-sm object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
