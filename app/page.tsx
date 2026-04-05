import { Navigation } from "@/components/landing/navigation";
import { HeroSection } from "@/components/landing/hero-section";
import { FooterSection } from "@/components/landing/footer-section";
import { PilotFeaturesSection } from "@/components/landing/pilot-features-section";
import { PilotHowItWorksSection } from "@/components/landing/pilot-how-it-works-section";
import { PilotPricingSection } from "@/components/landing/pilot-pricing-section";
import { PilotCtaSection } from "@/components/landing/pilot-cta-section";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <Navigation />
      <HeroSection />
      <PilotFeaturesSection />
      <PilotHowItWorksSection />
      <PilotPricingSection />
      <PilotCtaSection />
      <FooterSection />
    </main>
  );
}
