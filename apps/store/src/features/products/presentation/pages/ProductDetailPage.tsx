"use client";

import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { tid } from "shared";

import { CartDrawer } from "@/features/cart/presentation/components/CartDrawer";
import type { Product } from "@/features/products/domain/types";
import { MobileBarWithCart } from "@/features/products/presentation/components/product-detail/MobileBarWithCart";
import { ProductSections } from "@/features/products/presentation/components/product-detail/ProductSections";
import { mockProducts } from "@/mocks/data/products";
import { getCategoryTheme } from "@/shared/domain/categoryConstants";
import { Link } from "@/shared/infrastructure/i18n";

interface ProductDetailPageProps {
  productId: string;
}

export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const t = useTranslations("products");

  const maybeProduct = mockProducts.find((p) => p.id === productId);

  if (!maybeProduct) {
    notFound();
    return null;
  }

  const product: Product = maybeProduct;
  const theme = getCategoryTheme(product.category);

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

      <MobileBarWithCart product={product} theme={theme} />
    </div>
  );
}
