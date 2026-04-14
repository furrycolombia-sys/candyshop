import { useLocale } from "next-intl";
import { i18nField } from "shared";
import type { ProductSection } from "shared/types";

import { getCategoryTheme } from "@/features/products/domain/constants";
import type { Product } from "@/features/products/domain/types";
import { DescriptionSection } from "@/features/products/presentation/components/product-detail/DescriptionSection";
import { HeroSection } from "@/features/products/presentation/components/product-detail/HeroSection";
import { SectionRenderer } from "@/features/products/presentation/components/product-detail/sections";

interface ProductSectionsProps {
  product: Product;
}

export function ProductSections({ product }: ProductSectionsProps) {
  const locale = useLocale();
  const theme = getCategoryTheme(product.category);

  const longDescription = i18nField(product, "long_description", locale);

  const sections = [
    ...((product.sections as ProductSection[] | null) ?? []),
  ].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      <HeroSection product={product} theme={theme} />

      {longDescription && <DescriptionSection description={longDescription} />}

      {sections.map((section) => (
        <SectionRenderer
          key={`${section.type}-${section.sort_order}`}
          section={section}
          theme={theme}
        />
      ))}
    </>
  );
}
