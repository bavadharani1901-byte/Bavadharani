"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {/* Video Background */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        onLoadedData={() => setLoaded(true)}
      >
        <source src="/hero.mp4" type="video/mp4" />
      </video>

      {/* Gradient Overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />

      {/* Content - centered both horizontally and vertically */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pb-12 text-white md:px-12">
        <div className="mx-auto w-full max-w-5xl text-center">
          {/* Eyebrow badge */}
          <span
            className={`mb-6 inline-flex items-center gap-2 rounded-sm border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white/90 backdrop-blur-sm transition-all duration-700 sm:px-5 sm:py-2 sm:text-sm ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping bg-[#76b900]/70" />
              <span className="relative inline-flex h-2.5 w-2.5 bg-[#76b900]" />
            </span>
            AI-Powered River Intelligence for Chennai
          </span>

          {/* Display headline */}
            <h1
            className={`text-7xl font-bold uppercase leading-[0.95] tracking-tight text-white transition-all delay-150 duration-700 md:text-8xl lg:text-9xl xl:text-[140px] ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            RIVERGUARD AI
          </h1>

          {/* Subheading */}
          <p
            className={`mt-6 text-xl font-bold uppercase leading-relaxed tracking-wide text-white/80 transition-all delay-300 duration-700 md:text-2xl lg:text-3xl ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            River Pollution Monitoring & Restoration
          </p>

          <p
            className={`mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60 transition-all delay-450 duration-700 md:text-lg ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            Monitoring Adyar, Cooum and Kosasthalaiyar rivers with AI
            pollution detection, citizen reporting, and restoration coordination.
          </p>

          {/* CTA Buttons */}
          <div
            className={`mt-10 flex flex-col items-center justify-center gap-4 transition-all delay-600 duration-700 sm:flex-row ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center gap-2 rounded-sm bg-[#76b900] px-8 text-base font-bold text-black transition-all duration-150 hover:bg-[#5a8d00] active:scale-[0.98]"
            >
              Government Dashboard
            </Link>
            <Link
              href="/citizen"
              className="flex h-12 items-center justify-center gap-2 rounded-sm border border-white/60 bg-transparent px-8 text-base font-bold text-white transition-all duration-150 hover:border-white hover:bg-white/10 active:scale-[0.98]"
            >
              Report Pollution
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 transition-all delay-[900ms] duration-700 ${
            loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="animate-bounce">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeOpacity="0.6"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
