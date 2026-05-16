"use client";

import { useState, useRef, useCallback, useEffect, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ResizablePanelProps {
  direction: "horizontal" | "vertical";
  defaultSizes: [number, number];
  minSizes?: [number, number];
  children: [ReactNode, ReactNode];
  className?: string;
}

export default function ResizablePanel({
  direction,
  defaultSizes,
  minSizes = [20, 20],
  children,
  className,
}: ResizablePanelProps) {
  const [sizes, setSizes] = useState(defaultSizes);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const isHorizontal = direction === "horizontal";

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [isHorizontal]);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const total = isHorizontal ? rect.width : rect.height;
      const offset = isHorizontal
        ? e.clientX - rect.left
        : e.clientY - rect.top;

      const pct1 = Math.max(
        minSizes[0],
        Math.min(100 - minSizes[1], (offset / total) * 100),
      );
      const pct2 = 100 - pct1;

      setSizes([pct1, pct2]);
    },
    [isHorizontal, minSizes],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full",
        isHorizontal ? "flex-row" : "flex-col",
        className,
      )}
    >
      <div
        className="min-w-0 min-h-0 h-full w-full overflow-hidden"
        style={{ flex: `${sizes[0]} 1 0%` }}
      >
        {children[0]}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "relative z-10 flex shrink-0 items-center justify-center bg-border transition-colors hover:bg-[#76b900]",
          isHorizontal ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize",
        )}
      >
        <div
          className={cn(
            "rounded-full bg-muted-foreground/40",
            isHorizontal ? "h-8 w-0.5" : "w-8 h-0.5",
          )}
        />
      </div>

      <div
        className="min-w-0 min-h-0 h-full w-full overflow-hidden"
        style={{ flex: `${sizes[1]} 1 0%` }}
      >
        {children[1]}
      </div>
    </div>
  );
}
