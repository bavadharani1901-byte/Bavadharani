"use client";

import { useEffect, useRef, useState } from "react";
import LandingCardGlow from "@/components/landing/landing-card-glow";
import { WaveButton } from "@/components/ui/wave-button";
import { Check } from "lucide-react";

interface Role {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
}

const roles: Role[] = [
  {
    title: "Government",
    subtitle: "Monitor & Enforce",
    description:
      "Real-time dashboards with risk scores, satellite anomaly alerts, and citizen report tracking for rapid inspector deployment.",
    features: [
      "Live risk heatmaps",
      "Inspector action logging",
      "Automated alert routing",
      "Compliance tracking",
    ],
    cta: "Open Dashboard",
    href: "/dashboard",
  },
  {
    title: "NGO",
    subtitle: "Advocate & Measure",
    description:
      "Program-level metrics, before/after comparisons, and citizen engagement analytics tied to your conservation areas.",
    features: [
      "Program area metrics",
      "Before/after charts",
      "Citizen engagement stats",
      "Impact reporting",
    ],
    cta: "NGO Dashboard",
    href: "/dashboard?role=ngo",
  },
  {
    title: "Citizens",
    subtitle: "Report & Earn",
    description:
      "Mobile-first PWA to snap photos, report pollution, earn points, and redeem rewards while protecting your local rivers.",
    features: [
      "Photo-based reporting",
      "AI-powered validation",
      "Points & tier system",
      "Reward redemption",
    ],
    cta: "Report Pollution",
    href: "/citizen",
  },
];

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="border-t border-[#cccccc] bg-[#f7f7f7] py-16 md:py-20">
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
            Who It&apos;s For
          </span>
          <h2 className="text-3xl font-bold uppercase leading-[1.1] tracking-tight text-[#000000] md:text-4xl lg:text-5xl">
            Built for every stakeholder
          </h2>
        </div>

        {/* Role cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {roles.map((role, index) => (
            <div
              key={role.title}
              className={`transition-all duration-700 ${
                isVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-8 opacity-0"
              }`}
              style={{ transitionDelay: `${(index + 1) * 200}ms` }}
            >
              <LandingCardGlow variant="white" className="h-full">
                <div className="flex h-full flex-col p-6 pt-6">
                  <span className="mb-1 text-xs font-bold uppercase tracking-wider text-[#76b900]">
                    {role.subtitle}
                  </span>
                  <h3 className="mb-2 text-2xl font-bold uppercase leading-[1.1] text-[#000000]">
                    {role.title}
                  </h3>
                  <p className="mb-6 text-sm leading-relaxed text-[#757575]">{role.description}</p>

                  <ul className="mb-8 flex-1 space-y-2">
                    {role.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-[#757575]"
                      >
                        <Check className="h-4 w-4 shrink-0 text-[#000000]" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <WaveButton
                    variant="primary"
                    size="default"
                    className="w-full"
                    asChild
                  >
                    <a href={role.href}>{role.cta}</a>
                  </WaveButton>
                </div>
              </LandingCardGlow>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
