"use client";

import { ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { i18nField, tid } from "shared";

import { ImageGallery } from "./ImageGallery";
import { PriceBlock } from "./PriceBlock";
import { RatingStars } from "./RatingStars";

import type { Product } from "@/features/products/domain/types";
import { useAddToCart } from "@/shared/application/hooks/useAddToCart";
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
  const { added, quantityInCart, handleAddToCart } = useAddToCart(product);

  const name = i18nField(product, "name", locale);
  const tagline = i18nField(product, "tagline", locale);
  const description = i18nField(product, "description", locale);

  return (
    <section
      className={`w-full ${theme.bg}/15 border-b-[3px] border-foreground`}
      {...tid("hero-section")}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
          {/* Left: Image Gallery */}
          <ImageGallery product={product} theme={theme} />

          {/* Right: Product Info */}
          <div className="flex flex-col flex-1 gap-4 min-w-0">
            {/* Tagline */}
            {tagline && (
              <p
                className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.text}`}
                {...tid("hero-tagline")}
              >
                {tagline}
              </p>
            )}

            {/* Name */}
            <h1
              className="font-display text-4xl/tight lg:text-5xl/tight font-extrabold uppercase"
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
                className={`${theme.badgeBg} border-[3px] border-foreground px-3 py-1 text-xs font-bold text-foreground`}
                {...tid("hero-category")}
              >
                {tCategories(product.category)}
              </span>
              <span
                className="bg-background border-[3px] border-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                {...tid("hero-type")}
              >
                {tTypes(product.type)}
              </span>
              {product.is_active ? (
                <span className="bg-(--mint) border-[3px] border-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {t("inStock")}
                </span>
              ) : (
                <span className="bg-(--peach) border-[3px] border-foreground px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground">
                  {t("outOfStock")}
                </span>
              )}
            </div>

            {/* Rating */}
            {product.rating != null && product.review_count > 0 && (
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
              className="text-sm/relaxed text-muted-foreground max-w-prose"
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
                    className="bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Add to Cart CTA */}
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                className={`w-full sm:w-auto nb-btn nb-btn-press-lg nb-shadow-md font-display text-lg font-extrabold uppercase tracking-widest px-10 py-4 disabled:opacity-50 disabled:cursor-not-allowed ${theme.bg}`}
                onClick={handleAddToCart}
                disabled={!product.is_active || added}
                {...tid("hero-add-to-cart")}
              >
                <ShoppingCart className="size-5" />
                {added ? t("addedToCart") : t("addToCart")}
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
