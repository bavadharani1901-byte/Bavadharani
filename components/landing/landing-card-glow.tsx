"use client";

import BorderGlow from "@/components/BorderGlow";
import type { ReactNode } from "react";

interface LandingCardGlowProps {
  children: ReactNode;
  className?: string;
  variant?: "white" | "cloud";
}

export default function LandingCardGlow({
  children,
  className = "",
  variant = "white",
}: LandingCardGlowProps) {
  const bg = variant === "cloud" ? "#f7f7f7" : "#ffffff";

  return (
    <BorderGlow
      className={`persistent-glow ${className}`}
      edgeSensitivity={20}
      glowColor="82 100 45"
      backgroundColor={bg}
      borderRadius={2}
      glowRadius={16}
      glowIntensity={2.2}
      coneSpread={10}
      animated={true}
      colors={["#ccff33", "#a3e600", "#76b900"]}
      fillOpacity={0.75}
    >
      {children}
    </BorderGlow>
  );
}
