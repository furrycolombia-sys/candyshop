"use client";

import { ShoppingCart } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { i18nField, i18nPrice, tid } from "shared";

import { ProductCardImage } from "./ProductCardImage";
import { ProductCardMeta } from "./ProductCardMeta";

import {
  isProductAvailable,
  type Product,
} from "@/features/products/domain/types";
import { useAddToCart } from "@/shared/application/hooks/useAddToCart";
import { getCategoryColor } from "@/shared/domain/categoryConstants";
import { Link } from "@/shared/infrastructure/i18n";

type ProductCardVariant = "default" | "featured";

interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
}

export function ProductCard({
  product,
  variant = "default",
}: ProductCardProps) {
  const t = useTranslations("products");
  const tCategories = useTranslations("categories");
  const tTypes = useTranslations("productTypes");
  const locale = useLocale();
  const { added, quantityInCart, handleAddToCart } = useAddToCart(product);

  const categoryColor = getCategoryColor(product.category);
  const isFeatured = variant === "featured";
  const addToCartLabel = added ? t("addedToCart") : t("addToCart");
  const isAddToCartDisabled = !isProductAvailable(product) || added;
  const inCartLabel = t("inCart", { count: quantityInCart });
  const name = i18nField(product, "name", locale);
  const description = i18nField(product, "description", locale);

  return (
    <article
      className={`flex border-3 border-foreground nb-shadow-md bg-background transition-transform hover:-translate-1 ${
        isFeatured ? "flex-col sm:flex-row" : "flex-col"
      }`}
      {...tid("product-card")}
      data-product-id={product.id}
      data-variant={variant}
    >
      <Link
        href={`/products/${product.id}/${product.slug}`}
        className={`flex flex-1 no-underline text-foreground ${
          isFeatured ? "flex-col sm:flex-row" : "flex-col"
        }`}
        {...tid("product-card-link")}
      >
        <ProductCardImage
          product={product}
          categoryColor={categoryColor}
          isFeatured={isFeatured}
          featuredLabel={t("featured")}
          outOfStockLabel={t("outOfStock")}
          typeLabel={tTypes(product.type)}
          quantityInCart={quantityInCart}
          inCartLabel={inCartLabel}
        />

        {/* Content */}
        <div
          className={`flex flex-1 flex-col gap-3 ${
            isFeatured ? "p-5 sm:p-6 justify-center" : "p-4"
          }`}
        >
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`${categoryColor} border-2 border-foreground px-2 py-0.5 text-xs font-bold text-foreground`}
              {...tid("product-card-category")}
            >
              {tCategories(product.category)}
            </span>
            <span
              className="border-2 border-foreground px-2 py-0.5 text-tiny font-bold uppercase tracking-widest text-muted-foreground"
              {...tid("product-card-type")}
            >
              {tTypes(product.type)}
            </span>
          </div>

          {/* Name */}
          <h3
            className={`font-display font-extrabold ${
              isFeatured ? "text-xl/tight sm:text-2xl/tight" : "text-base/tight"
            }`}
            {...tid("product-card-name")}
          >
            {name}
          </h3>

          {/* Description — only on featured */}
          {isFeatured && description && (
            <p
              className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-3"
              {...tid("product-card-description")}
            >
              {description}
            </p>
          )}

          {/* Type-specific info */}
          <div
            className="text-xs text-muted-foreground"
            {...tid("product-card-meta")}
          >
            <ProductCardMeta product={product} />
          </div>

          {/* Price */}
          <div
            className={`mt-auto pt-2 ${
              isFeatured
                ? "flex flex-col sm:flex-row sm:items-center gap-3"
                : ""
            }`}
          >
            <span
              className={`font-display font-extrabold ${
                isFeatured ? "text-2xl sm:text-3xl" : "text-xl"
              }`}
              {...tid("product-card-price")}
            >
              {i18nPrice(product, locale)}
            </span>

            {isFeatured && (
              <button
                className="sm:ml-auto nb-btn nb-btn-press-sm nb-shadow-md font-display font-extrabold uppercase tracking-widest px-8 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleAddToCart}
                disabled={isAddToCartDisabled}
                {...tid("product-card-add-to-cart")}
              >
                <ShoppingCart className="size-4" />
                {addToCartLabel}
              </button>
            )}
          </div>
        </div>
      </Link>

      {/* Add to Cart — outside the link (default variant only) */}
      {!isFeatured && (
        <div className="px-4 pb-4">
          <button
            className="w-full justify-center nb-btn nb-btn-press-sm nb-shadow-md font-display text-xs font-extrabold uppercase tracking-widest px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAddToCart}
            disabled={isAddToCartDisabled}
            {...tid("product-card-add-to-cart")}
          >
            <ShoppingCart className="size-3.5" />
            {addToCartLabel}
          </button>
        </div>
      )}
    </article>
  );
}
