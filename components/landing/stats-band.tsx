"use client";

import { useEffect, useRef, useState } from "react";

interface StatItemProps {
  value: string;
  label: string;
  delay: number;
  isVisible: boolean;
}

function StatItem({ value, label, delay, isVisible }: StatItemProps) {
  const [displayValue, setDisplayValue] = useState("0");
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ""));
  const suffix = value.replace(/[0-9.,]/g, "");
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isVisible || hasRun.current) return;
    hasRun.current = true;

    const duration = 2000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(numericValue * eased);
      setDisplayValue(current.toLocaleString() + suffix);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [isVisible, numericValue, suffix, value, delay]);

  return (
    <div
      className={`flex flex-col items-center px-8 transition-all duration-700 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span className="text-4xl leading-[1.1] font-bold text-[#000000] uppercase md:text-5xl">
        {displayValue}
      </span>
      <span className="mt-2 max-w-[200px] text-center text-sm font-bold text-[#757575]">
        {label}
      </span>
    </div>
  );
}

export default function StatsBand() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const stats = [
    { value: "3", label: "Chennai rivers monitored" },
    { value: "48+", label: "km total river length" },
    { value: "250+", label: "citizen reports submitted" },
    // { value: "75%", label: "industrial wastewater untreated" },
  ];

  return (
    <section
      ref={sectionRef}
      className="border-b border-[#cccccc] bg-white py-16 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-center justify-center gap-y-8">
          {stats.map((stat, index) => (
            <div key={stat.label} className="flex items-center">
              <StatItem
                value={stat.value}
                label={stat.label}
                delay={index * 150}
                isVisible={isVisible}
              />
              {index < stats.length - 1 && (
                <div className="hidden h-12 w-px bg-[#cccccc] md:mx-8 md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
