"use client";

import { CtaSection } from "../components/CtaSection";
import { FeaturesSection } from "../components/FeaturesSection";
import { HeroSection } from "../components/HeroSection";
import { RolesSection } from "../components/RolesSection";

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
