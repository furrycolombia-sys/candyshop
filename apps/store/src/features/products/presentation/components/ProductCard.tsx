"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { useCart } from "@/features/cart";
import { PRODUCT_CATEGORIES } from "@/features/products/domain/constants";
import type { Product } from "@/features/products/domain/types";
import { Link } from "@/shared/infrastructure/i18n";

const ADDED_RESET_MS = 1500;

interface ProductCardProps {
  product: Product;
}

function getCategoryColor(category: Product["category"]): string {
  const found = PRODUCT_CATEGORIES.find((c) => c.value === category);
  return found?.color ?? "bg-(--mint)";
}

export function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations("products");
  const tCategories = useTranslations("categories");
  const tTypes = useTranslations("productTypes");
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const categoryColor = getCategoryColor(product.category);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <article
      className="flex flex-col border-[3px] border-foreground nb-shadow-md bg-background transition-transform hover:-translate-1"
      {...tid("product-card")}
      {...({ "data-product-id": product.id } as Record<string, string>)}
    >
      <Link
        href={`/products/${product.slug}`}
        className="flex flex-col flex-1 no-underline text-foreground"
        {...tid("product-card-link")}
      >
        {/* Image / Placeholder */}
        <div
          className={`relative flex items-center justify-center h-48 border-b-[3px] border-foreground ${categoryColor}`}
          {...tid("product-card-image")}
        >
          <span className="font-display text-lg font-extrabold uppercase tracking-widest text-foreground opacity-40">
            {tTypes(product.type)}
          </span>

          {product.featured && (
            <span className="absolute top-2 left-2 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
              {t("featured")}
            </span>
          )}

          {!product.inStock && (
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/60">
              <span className="font-display text-base font-extrabold uppercase tracking-widest text-background">
                {t("outOfStock")}
              </span>
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4 gap-3">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`${categoryColor} border-2 border-foreground px-2 py-0.5 text-xs font-bold text-foreground`}
              {...tid("product-card-category")}
            >
              {tCategories(product.category)}
            </span>
            <span
              className="border-2 border-foreground px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              {...tid("product-card-type")}
            >
              {tTypes(product.type)}
            </span>
          </div>

          {/* Name */}
          <h3
            className="font-display text-base/tight font-extrabold"
            {...tid("product-card-name")}
          >
            {product.name}
          </h3>

          {/* Type-specific info */}
          <div
            className="text-xs text-muted-foreground"
            {...tid("product-card-meta")}
          >
            {product.type === "commission" && product.commission && (
              <p>
                {t("slotsAvailable", {
                  available: product.commission.slotsAvailable,
                  total: product.commission.totalSlots,
                })}
              </p>
            )}
            {product.type === "ticket" && product.ticket && (
              <p>
                {t("ticketsRemaining", {
                  remaining: product.ticket.ticketsRemaining,
                })}
              </p>
            )}
            {product.type === "digital" && <p>{t("digital")}</p>}
            {product.type === "physical" && product.physical?.shipsFrom && (
              <p>{t("shipsFrom", { location: product.physical.shipsFrom })}</p>
            )}
          </div>

          {/* Price */}
          <div className="mt-auto pt-2">
            <span
              className="font-display text-xl font-extrabold"
              {...tid("product-card-price")}
            >
              ${product.price.toLocaleString()}
            </span>
          </div>
        </div>
      </Link>

      {/* Add to Cart — outside the link */}
      <div className="px-4 pb-4">
        <button
          className="w-full nb-btn nb-btn-press-sm text-xs font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleAddToCart}
          disabled={!product.inStock || added}
          {...tid("product-card-add-to-cart")}
        >
          {added ? t("addedToCart") : t("addToCart")}
        </button>
      </div>
    </article>
  );
}
