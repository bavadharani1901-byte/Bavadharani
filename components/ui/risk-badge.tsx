import * as React from "react";

import { cn } from "@/lib/utils";

const riskConfig = {
  low: {
    label: "Low",
    border: "border-[#3f8500]",
    text: "text-[#3f8500]",
    dot: "bg-[#3f8500]",
  },
  medium: {
    label: "Medium",
    border: "border-[#ef9100]",
    text: "text-[#ef9100]",
    dot: "bg-[#ef9100]",
  },
  high: {
    label: "High",
    border: "border-[#df6500]",
    text: "text-[#df6500]",
    dot: "bg-[#df6500]",
  },
  critical: {
    label: "Critical",
    border: "border-[#e52020]",
    text: "text-[#e52020]",
    dot: "bg-[#e52020]",
  },
};

type RiskLevel = keyof typeof riskConfig;

export interface RiskBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  level: RiskLevel;
  showDot?: boolean;
}

function RiskBadge({
  className,
  level,
  showDot = true,
  ...props
}: RiskBadgeProps) {
  const config = riskConfig[level];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-3 py-1 text-xs font-bold uppercase tracking-wide",
        config.border,
        config.text,
        className,
      )}
      {...props}
    >
      {showDot && (
        <span className={cn("h-2 w-2 rounded-full", config.dot)} />
      )}
      {config.label}
    </span>
  );
}

export { RiskBadge, riskConfig };
export type { RiskLevel };
