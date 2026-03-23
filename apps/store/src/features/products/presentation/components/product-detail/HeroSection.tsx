"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { ImageGallery } from "./ImageGallery";

import { useCart } from "@/features/cart";
import type { CategoryTheme } from "@/features/products/domain/constants";
import type { Product } from "@/features/products/domain/types";

const ADDED_RESET_MS = 1500;

interface HeroSectionProps {
  product: Product;
  theme: CategoryTheme;
}

function renderStars(rating: number, theme: CategoryTheme) {
  return Array.from({ length: 5 }, (_, i) => {
    const filled = i < Math.round(rating);
    const cls = filled
      ? `size-4 fill-current ${theme.text}`
      : "size-4 text-muted-foreground";
    return <Star key={i} className={cls} />;
  });
}

export function HeroSection({ product, theme }: HeroSectionProps) {
  const t = useTranslations("products");
  const tCategories = useTranslations("categories");
  const tTypes = useTranslations("productTypes");
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  function handleAddToCart() {
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      currency: product.currency,
      image: product.images[0]?.url,
      type: product.type,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), ADDED_RESET_MS);
  }

  const compareAtPrice = product.compareAtPrice;
  const hasDiscount =
    compareAtPrice !== undefined && compareAtPrice > product.price;

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
            {product.tagline && (
              <p
                className={`text-xs font-bold uppercase tracking-[0.2em] ${theme.text}`}
                {...tid("hero-tagline")}
              >
                {product.tagline}
              </p>
            )}

            {/* Name */}
            <h1
              className="font-display text-4xl/tight lg:text-5xl/tight font-extrabold uppercase"
              {...tid("hero-name")}
            >
              {product.name}
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
              {product.inStock ? (
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
            {product.rating !== undefined &&
              product.reviewCount !== undefined && (
                <div
                  className="flex items-center gap-2"
                  {...tid("hero-rating")}
                >
                  <div className="flex items-center gap-0.5">
                    {renderStars(product.rating, theme)}
                  </div>
                  <span className="text-sm font-bold">
                    {t("detail.stars", {
                      rating: product.rating.toFixed(1),
                    })}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    (
                    {t("detail.reviewsCount", {
                      count: product.reviewCount,
                    })}
                    )
                  </span>
                </div>
              )}

            {/* Price block */}
            <div
              className="border-[3px] border-foreground bg-background p-4 nb-shadow-sm"
              {...tid("hero-price")}
            >
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-display text-5xl font-extrabold">
                  ${product.price.toLocaleString()}
                </span>
                <span className="text-sm font-sans text-muted-foreground">
                  {product.currency}
                </span>
                {hasDiscount && compareAtPrice !== undefined && (
                  <span className="font-display text-2xl font-bold line-through text-muted-foreground">
                    ${compareAtPrice.toLocaleString()}
                  </span>
                )}
              </div>
              {hasDiscount && compareAtPrice !== undefined && (
                <div className="mt-2">
                  <span className="bg-(--lemon) border-[3px] border-foreground px-2 py-0.5 text-xs font-bold uppercase tracking-widest">
                    {t("detail.discount", {
                      amount: `$${(compareAtPrice - product.price).toLocaleString()}`,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Short description */}
            <p
              className="text-sm/relaxed text-muted-foreground max-w-prose"
              {...tid("hero-description")}
            >
              {product.description}
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
            <div className="mt-2">
              <button
                className={`w-full sm:w-auto nb-btn nb-btn-press-lg nb-shadow-md font-display text-lg font-extrabold uppercase tracking-widest px-10 py-4 disabled:opacity-50 disabled:cursor-not-allowed ${theme.bg}`}
                onClick={handleAddToCart}
                disabled={!product.inStock || added}
                {...tid("hero-add-to-cart")}
              >
                {added ? t("addedToCart") : t("addToCart")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
