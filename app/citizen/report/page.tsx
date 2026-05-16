"use client";

import { useZones } from "@/hooks/use-zones";
import ReportFlow from "@/components/citizen/report-flow";
import CitizenNav from "@/components/citizen/citizen-nav";

export default function CitizenReportPage() {
  const { zones } = useZones(0);
  const zoneOptions = zones.map((z) => ({ id: z.id, name: z.name }));

  return (
    <div className="flex min-h-screen flex-col bg-white pb-20">
      <CitizenNav />
      <ReportFlow zones={zoneOptions} />
    </div>
  );
}
