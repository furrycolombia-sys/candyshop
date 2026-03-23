"use client";

import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { CartDrawer, useCart } from "@/features/cart";
import { getCategoryTheme } from "@/features/products/domain/constants";
import type { Product } from "@/features/products/domain/types";
import { MobileBar } from "@/features/products/presentation/components/product-detail/MobileBar";
import { ProductSections } from "@/features/products/presentation/components/product-detail/ProductSections";
import { mockProducts } from "@/mocks/data/products";
import { Link } from "@/shared/infrastructure/i18n";

const ADDED_RESET_MS = 1500;

interface ProductDetailPageProps {
  slug: string;
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const t = useTranslations("products");
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const maybeProduct = mockProducts.find((p) => p.slug === slug);

  if (!maybeProduct) {
    notFound();
    return null;
  }

  const product: Product = maybeProduct;
  const theme = getCategoryTheme(product.category);

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

  return (
    <div className="flex-1 flex flex-col" {...tid("product-detail-page")}>
      {/* Inline nav: back + cart — sits inside the hero background */}
      <div className={`${theme.bg}/15 border-b-[3px] border-foreground`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            {...tid("product-detail-back")}
          >
            {t("detail.backToProducts")}
          </Link>
          <CartDrawer />
        </div>
      </div>

      <ProductSections product={product} />

      <MobileBar
        product={product}
        added={added}
        onAddToCart={handleAddToCart}
        theme={theme}
      />
    </div>
  );
}
