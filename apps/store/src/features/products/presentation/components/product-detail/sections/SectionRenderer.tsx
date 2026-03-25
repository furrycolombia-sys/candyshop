import type { ProductSection } from "shared/types";

import type { CategoryTheme } from "@/features/products/domain/constants";
import { AccordionSection } from "@/features/products/presentation/components/product-detail/sections/AccordionSection";
import { CardsSection } from "@/features/products/presentation/components/product-detail/sections/CardsSection";
import { GallerySection } from "@/features/products/presentation/components/product-detail/sections/GallerySection";
import { TwoColumnSection } from "@/features/products/presentation/components/product-detail/sections/TwoColumnSection";

interface SectionRendererProps {
  section: ProductSection;
  theme: CategoryTheme;
}

export function SectionRenderer({ section, theme }: SectionRendererProps) {
  switch (section.type) {
    case "cards": {
      return <CardsSection section={section} theme={theme} />;
    }
    case "accordion": {
      return <AccordionSection section={section} theme={theme} />;
    }
    case "two-column": {
      return <TwoColumnSection section={section} theme={theme} />;
    }
    case "gallery": {
      return <GallerySection section={section} theme={theme} />;
    }
    default: {
      return null;
    }
  }
}
