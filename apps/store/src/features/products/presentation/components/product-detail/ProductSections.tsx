import { useLocale } from "next-intl";
import { i18nField } from "shared";

import { getCategoryTheme } from "@/features/products/domain/constants";
import type {
  Product,
  ProductFaq,
  ProductHighlight,
  ProductScreenshot,
} from "@/features/products/domain/types";
import { DescriptionSection } from "@/features/products/presentation/components/product-detail/DescriptionSection";
import { FaqSection } from "@/features/products/presentation/components/product-detail/FaqSection";
import { HeroSection } from "@/features/products/presentation/components/product-detail/HeroSection";
import { HighlightsSection } from "@/features/products/presentation/components/product-detail/HighlightsSection";
import { ScreenshotsSection } from "@/features/products/presentation/components/product-detail/ScreenshotsSection";
import { SpecsSection } from "@/features/products/presentation/components/product-detail/SpecsSection";

interface ProductSectionsProps {
  product: Product;
}

export function ProductSections({ product }: ProductSectionsProps) {
  const locale = useLocale();
  const theme = getCategoryTheme(product.category);

  const highlights = (product.highlights as ProductHighlight[] | null) ?? [];
  const longDescription = i18nField(product, "long_description", locale);
  const screenshots = (product.screenshots as ProductScreenshot[] | null) ?? [];
  const faq = (product.faq as ProductFaq[] | null) ?? [];

  const hasTypeDetails =
    product.type_details != null &&
    typeof product.type_details === "object" &&
    Object.keys(product.type_details as Record<string, unknown>).length > 0;

  return (
    <>
      <HeroSection product={product} theme={theme} />

      {highlights.length > 0 && (
        <HighlightsSection highlights={highlights} theme={theme} />
      )}

      {longDescription && (
        <DescriptionSection description={longDescription} theme={theme} />
      )}

      {screenshots.length > 0 && (
        <ScreenshotsSection screenshots={screenshots} theme={theme} />
      )}

      {hasTypeDetails && <SpecsSection product={product} theme={theme} />}

      {faq.length > 0 && <FaqSection faq={faq} theme={theme} />}
    </>
  );
}
