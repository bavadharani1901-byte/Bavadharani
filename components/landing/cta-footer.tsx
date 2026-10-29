"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WaveButton } from "@/components/ui/wave-button";

export default function CtaFooter() {
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

  return (
    <section ref={sectionRef} className="bg-[#000000] py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <div
          className={`transition-all duration-700 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <h2 className="text-3xl leading-[1.1] font-bold tracking-tight text-white uppercase md:text-4xl lg:text-5xl">
            Join the movement for{" "}
            <span className="text-[#76b900]">cleaner rivers</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#898989]">
            Whether you are a government official, NGO worker, or concerned
            citizen - RiverGuard AI puts water intelligence in your hands.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <WaveButton variant="primary" size="lg" asChild>
              <Link href="/dashboard">View Dashboard</Link>
            </WaveButton>
            <WaveButton variant="outline-on-dark" size="lg" asChild>
              <Link href="/citizen">Report Pollution</Link>
            </WaveButton>
          </div>
        </div>
      </div>
    </section>
  );
}
