"use client";

import { useMemo } from "react";
import type { Zone } from "@/hooks/use-zones";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

function riskBadgeVariant(level: string) {
  switch (level) {
    case "critical":
      return "destructive";
    case "high":
      return "warning";
    case "medium":
      return "secondary";
    default:
      return "default";
  }
}

function riskDotClass(level: string) {
  const colors: Record<string, string> = {
    low: "bg-[#3f8500]",
    medium: "bg-[#ef9100]",
    high: "bg-[#df6500]",
    critical: "bg-[#e52020]",
  };
  return colors[level] ?? "bg-muted-foreground";
}

interface ZoneListProps {
  zones: Zone[];
  selectedZoneId: string | null;
  onSelectZone: (zoneId: string) => void;
}

export default function ZoneList({
  zones,
  selectedZoneId,
  onSelectZone,
}: ZoneListProps) {
  const sorted = useMemo(
    () => zones.slice().sort((a, b) => b.risk_score - a.risk_score),
    [zones],
  );

  return (
    <div className="flex h-full flex-col border-l bg-background">
      <div className="px-4 py-3">
        <h3 className="text-sm font-bold uppercase tracking-wider">
          Monitored Zones
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sorted by risk score
        </p>
      </div>
      <Separator />
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="pb-2">
            {sorted.map((zone) => {
              const isSelected = zone.id === selectedZoneId;
              return (
                <button
                  key={zone.id}
                  onClick={() => onSelectZone(zone.id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0",
                    isSelected
                      ? "bg-accent"
                      : "hover:bg-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      riskDotClass(zone.risk_level),
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{zone.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {zone.province}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge
                      variant={riskBadgeVariant(zone.risk_level) as any}
                      className="text-[10px]"
                    >
                      {zone.risk_score}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
