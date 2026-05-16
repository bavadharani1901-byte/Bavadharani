"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useZones } from "@/hooks/use-zones";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import ZoneMap from "@/components/dashboard/zone-map";
import ZoneList from "@/components/dashboard/zone-list";
import ZoneDetail from "@/components/dashboard/zone-detail";
import ResizablePanel from "@/components/dashboard/resizable-panel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PanelRight } from "lucide-react";

export default function DashboardPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const { data: session, status } = useSession();
  const role: "government" | "ngo" =
    session?.user?.role === "NGO" ? "ngo" : "government";
  const { zones, refetch } = useZones(5000);

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;

  const handleInspect = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSelectZone = useCallback(
    (zoneId: string) => {
      setSelectedZoneId(zoneId);
      setMobilePanelOpen(true);
    },
    [],
  );

  return (
    <div className="flex h-screen flex-col">
      <DashboardNav role={role} loading={status === "loading"} />
      <main className="flex flex-1 overflow-hidden">
        {/* Desktop: resizable map + sidebar */}
        <div className="hidden h-full flex-1 md:flex">
          <ResizablePanel
            direction="horizontal"
            defaultSizes={[70, 30]}
            minSizes={[45, 22]}
          >
            <div className="h-full w-full">
              <ZoneMap
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={handleSelectZone}
              />
            </div>

            <ResizablePanel
              direction="vertical"
              defaultSizes={[40, 60]}
              minSizes={[20, 25]}
            >
              <ZoneList
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
              />
              <ZoneDetail zone={selectedZone} onInspect={handleInspect} />
            </ResizablePanel>
          </ResizablePanel>
        </div>

        {/* Mobile: map only + sheet */}
        <div className="relative flex-1 md:hidden">
          <ZoneMap
            zones={zones}
            selectedZoneId={selectedZoneId}
            onSelectZone={handleSelectZone}
          />
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-3 left-3 z-[400] h-8 gap-1.5 text-xs shadow-sm"
            onClick={() => setMobilePanelOpen(true)}
          >
            <PanelRight className="h-3.5 w-3.5" />
            Zones
          </Button>
        </div>
      </main>

      {/* Mobile Sheet */}
      <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <SheetContent side="right" className="w-full p-0 sm:w-96">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-sm font-bold uppercase tracking-wide">
              {selectedZone ? selectedZone.name : "Monitored Zones"}
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100%-60px)] flex-col">
            {!selectedZone ? (
              <ZoneList
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
              />
            ) : (
              <>
                <div className="flex-1 overflow-hidden">
                  <ZoneDetail zone={selectedZone} onInspect={handleInspect} />
                </div>
                <div className="border-t p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setSelectedZoneId(null)}
                  >
                    Back to Zone List
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
