import { getCategoryTheme } from "@/features/products/domain/constants";
import type {
  Product,
  ProductFaq,
  ProductHighlight,
  ProductReview,
  ProductScreenshot,
  ProductSeller,
} from "@/features/products/domain/types";
import { DescriptionSection } from "@/features/products/presentation/components/product-detail/DescriptionSection";
import { FaqSection } from "@/features/products/presentation/components/product-detail/FaqSection";
import { HeroSection } from "@/features/products/presentation/components/product-detail/HeroSection";
import { HighlightsSection } from "@/features/products/presentation/components/product-detail/HighlightsSection";
import { ReviewsSection } from "@/features/products/presentation/components/product-detail/ReviewsSection";
import { ScreenshotsSection } from "@/features/products/presentation/components/product-detail/ScreenshotsSection";
import { SellerSection } from "@/features/products/presentation/components/product-detail/SellerSection";
import { SpecsSection } from "@/features/products/presentation/components/product-detail/SpecsSection";

interface ProductSectionsProps {
  product: Product;
}

interface NarrowedProduct extends Product {
  highlights: ProductHighlight[];
  longDescription: string;
  screenshots: ProductScreenshot[];
  seller: ProductSeller;
  reviews: ProductReview[];
  faq: ProductFaq[];
  rating: number;
  reviewCount: number;
}

function hasTypeDetails(product: Product): boolean {
  return Boolean(
    product.commission ?? product.ticket ?? product.digital ?? product.physical,
  );
}

function toNarrowed(product: Product): Partial<NarrowedProduct> {
  const reviews = product.reviews ?? [];
  const hasReviews =
    reviews.length > 0 &&
    product.rating !== undefined &&
    product.reviewCount !== undefined;

  return {
    highlights: product.highlights?.length ? product.highlights : undefined,
    longDescription: product.longDescription ?? undefined,
    screenshots: product.screenshots?.length ? product.screenshots : undefined,
    seller: product.seller ?? undefined,
    reviews: hasReviews ? reviews : undefined,
    rating: hasReviews ? product.rating : undefined,
    reviewCount: hasReviews ? product.reviewCount : undefined,
    faq: product.faq?.length ? product.faq : undefined,
  };
}

export function ProductSections({ product }: ProductSectionsProps) {
  const n = toNarrowed(product);
  const hasSpecs = Boolean(product.specs?.length) || hasTypeDetails(product);
  const theme = getCategoryTheme(product.category);

  return (
    <>
      <HeroSection product={product} theme={theme} />

      {n.highlights && (
        <HighlightsSection highlights={n.highlights} theme={theme} />
      )}

      {n.longDescription && (
        <DescriptionSection description={n.longDescription} theme={theme} />
      )}

      {n.screenshots && (
        <ScreenshotsSection screenshots={n.screenshots} theme={theme} />
      )}

      {hasSpecs && (
        <SpecsSection
          specs={product.specs ?? []}
          product={product}
          theme={theme}
        />
      )}

      {n.seller && <SellerSection seller={n.seller} theme={theme} />}

      {n.reviews && n.rating !== undefined && n.reviewCount !== undefined && (
        <ReviewsSection
          reviews={n.reviews}
          rating={n.rating}
          reviewCount={n.reviewCount}
          theme={theme}
        />
      )}

      {n.faq && <FaqSection faq={n.faq} theme={theme} />}
    </>
  );
}
