"use client";

import { useEffect, useRef, useState } from "react";
import LandingCardGlow from "@/components/landing/landing-card-glow";
import { Satellite, Camera, Map, Zap } from "lucide-react";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    icon: <Satellite className="h-6 w-6 text-[#76b900]" />,
    title: "Satellite Detection",
    description: "Sentinel-2 imagery detects water anomalies",
  },
  {
    icon: <Camera className="h-6 w-6 text-[#76b900]" />,
    title: "Citizen Photos",
    description: "Mobile-first PWA for geotagged submissions",
  },
  {
    icon: <Map className="h-6 w-6 text-[#76b900]" />,
    title: "Source Attribution",
    description: "OSM geospatial analysis of pollution sources",
  },
  {
    icon: <Zap className="h-6 w-6 text-[#76b900]" />,
    title: "Risk Score",
    description: "Rule-based AI risk score for each zone",
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div
          className={`mb-10 transition-all duration-700 ${
            isVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-8 opacity-0"
          }`}
        >
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-wider text-[#757575]">
            How It Works
          </span>
          <h2 className="text-3xl font-bold uppercase leading-[1.1] tracking-tight text-[#000000] md:text-4xl lg:text-5xl">
            Four steps to cleaner water
          </h2>
        </div>

        {/* Steps grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="relative">
              <div
                className={`transition-all duration-700 ${
                  isVisible
                    ? "translate-y-0 opacity-100"
                    : "translate-y-8 opacity-0"
                }`}
                style={{ transitionDelay: `${(index + 1) * 150}ms` }}
              >
                <LandingCardGlow variant="cloud" className="h-full">
                  <div className="flex flex-col items-start p-6 pt-6">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-sm bg-[#f7f7f7] border border-[#cccccc]">
                      {step.icon}
                    </div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-sm bg-[#000000] text-[10px] font-bold text-white">
                        {index + 1}
                      </span>
                      <h3 className="font-bold text-base text-[#000000]">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-sm text-[#757575]">
                      {step.description}
                    </p>
                  </div>
                </LandingCardGlow>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
