import HeroSection from "@/components/landing/hero-section";
import StatsBand from "@/components/landing/stats-band";
import HowItWorks from "@/components/landing/how-it-works";
import FeaturesSection from "@/components/landing/features-section";
import CtaFooter from "@/components/landing/cta-footer";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <HeroSection />
      <StatsBand />
      <HowItWorks />
      <FeaturesSection />
      <CtaFooter />
    </main>
  );
}
