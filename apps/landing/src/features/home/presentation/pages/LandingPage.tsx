import { CtaSection } from "@/features/home/presentation/components/CtaSection";
import { FeaturesSection } from "@/features/home/presentation/components/FeaturesSection";
import { HeroSection } from "@/features/home/presentation/components/HeroSection";
import { RolesSection } from "@/features/home/presentation/components/RolesSection";

export function LandingPage() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <RolesSection />
      <CtaSection />
    </main>
  );
}
