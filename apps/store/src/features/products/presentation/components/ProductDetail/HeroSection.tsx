"use client";

import { ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { i18nField, tid } from "shared";

import { ImageGallery } from "./ImageGallery";
import { PriceBlock } from "./PriceBlock";
import { RatingStars } from "./RatingStars";

import { useAddToCart } from "@/features/cart";
import {
  isProductAvailable,
  type Product,
} from "@/features/products/domain/types";
import type { CategoryTheme } from "@/shared/domain/categoryConstants";

interface HeroSectionProps {
  product: Product;
  theme: CategoryTheme;
}

export function HeroSection({ product, theme }: HeroSectionProps) {
  const t = useTranslations("products");
  const tCategories = useTranslations("categories");
  const tTypes = useTranslations("productTypes");
  const locale = useLocale();
  const { isAdded, quantityInCart, hasReachedStockLimit, handleAddToCart } =
    useAddToCart(product);

  const name = i18nField(product, "name", locale);
  const tagline = i18nField(product, "tagline", locale);
  const description = i18nField(product, "description", locale);

  const isAvailable = isProductAvailable(product);

  return (
    <section
      className="w-full overflow-x-hidden border-b-strong border-foreground"
      style={{ backgroundColor: theme.bgLight }}
      {...tid("hero-section")}
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:py-10 lg:py-14">
        <div className="flex flex-col items-start gap-6 sm:gap-8 lg:flex-row lg:gap-10">
          {/* Left: Image Gallery */}
          <ImageGallery product={product} theme={theme} />

          {/* Right: Product Info */}
          <div className="flex flex-col flex-1 gap-4 min-w-0">
            {/* Tagline */}
            {tagline && (
              <p
                className="inline-block self-start border-strong border-foreground px-2 py-0.5 text-xs font-bold uppercase tracking-section"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.foreground,
                }}
                {...tid("hero-tagline")}
              >
                {tagline}
              </p>
            )}

            {/* Name */}
            <h1
              className="font-display text-3xl/tight font-extrabold uppercase sm:text-4xl/tight lg:text-5xl/tight"
              {...tid("hero-name")}
            >
              {name}
            </h1>

            {/* Badges */}
            <div
              className="flex items-center gap-2 flex-wrap"
              {...tid("hero-badges")}
            >
              <span
                className="border-strong border-foreground px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: theme.badgeBg,
                  color: theme.foreground,
                }}
                {...tid("hero-category")}
              >
                {tCategories(product.category)}
              </span>
              <span
                className="bg-background border-strong border-foreground px-3 py-1 text-ui-xs font-bold uppercase tracking-widest text-muted-foreground"
                {...tid("hero-type")}
              >
                {tTypes(product.type)}
              </span>
              {isAvailable ? (
                <span className="border-strong border-foreground bg-success px-3 py-1 text-ui-xs font-bold uppercase tracking-widest text-success-foreground">
                  {t("inStock")}
                </span>
              ) : (
                <span className="border-strong border-foreground bg-warning px-3 py-1 text-ui-xs font-bold uppercase tracking-widest text-warning-foreground">
                  {t("outOfStock")}
                </span>
              )}
              {product.refundable === true && (
                <span
                  className="border-strong border-foreground bg-success px-3 py-1 text-ui-xs font-bold uppercase tracking-widest text-success-foreground"
                  {...tid("hero-refundable")}
                >
                  {t("refundable")}
                </span>
              )}
              {product.refundable === false && (
                <span
                  className="border-strong border-foreground bg-warning px-3 py-1 text-ui-xs font-bold uppercase tracking-widest text-warning-foreground"
                  {...tid("hero-non-refundable")}
                >
                  {t("nonRefundable")}
                </span>
              )}
            </div>

            {/* Rating */}
            {product.rating != null && (product.review_count ?? 0) > 0 && (
              <div className="flex items-center gap-2" {...tid("hero-rating")}>
                <div className="flex items-center gap-0.5">
                  <RatingStars rating={product.rating} theme={theme} />
                </div>
                <span className="text-sm font-bold">
                  {t("detail.stars", {
                    rating: product.rating.toFixed(1),
                  })}
                </span>
                <span className="text-sm text-muted-foreground">
                  (
                  {t("detail.reviewsCount", {
                    count: product.review_count,
                  })}
                  )
                </span>
              </div>
            )}

            {/* Price block */}
            <PriceBlock
              product={product}
              discountLabel={(values) => t("detail.discount", values)}
            />

            {/* Short description */}
            <p
              className="max-w-prose text-sm/relaxed text-muted-foreground"
              {...tid("hero-description")}
            >
              {description}
            </p>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-muted px-2 py-0.5 text-ui-xs font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Add to Cart CTA */}
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className="button-brutal button-press-lg shadow-brutal-md w-full px-6 py-3 font-display text-base font-extrabold uppercase tracking-widest disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-10 sm:py-4 sm:text-lg"
                style={{
                  backgroundColor: theme.bg,
                  color: theme.foreground,
                }}
                onClick={handleAddToCart}
                disabled={!isAvailable || isAdded || hasReachedStockLimit}
                {...tid("hero-add-to-cart")}
              >
                <ShoppingCart className="size-5" />
                {isAdded ? t("addedToCart") : t("addToCart")}
              </button>
              {quantityInCart > 0 && (
                <span
                  className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-widest"
                  {...tid("hero-in-cart")}
                >
                  <ShoppingCart className="size-4" />
                  {t("inCart", { count: quantityInCart })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
