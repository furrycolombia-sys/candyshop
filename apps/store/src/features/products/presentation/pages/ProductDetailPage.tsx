"use client";

import { useTranslations } from "next-intl";
import { tid } from "shared";

import { CartDrawer } from "@/features/cart/presentation/components/CartDrawer";
import { useStoreProduct } from "@/features/products/application/useStoreProducts";
import { MobileBarWithCart } from "@/features/products/presentation/components/product-detail/MobileBarWithCart";
import { ProductSections } from "@/features/products/presentation/components/product-detail/ProductSections";
import { getCategoryTheme } from "@/shared/domain/categoryConstants";
import { Link } from "@/shared/infrastructure/i18n";

interface ProductDetailPageProps {
  productId: string;
}

/* eslint-disable sonarjs/no-duplicate-string -- Tailwind class strings are not DRY violations */
export function ProductDetailPage({ productId }: ProductDetailPageProps) {
  const t = useTranslations("products");
  const { data: product, isLoading, isError } = useStoreProduct(productId);

  if (isLoading) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[50vh]"
        {...tid("product-detail-page")}
      >
        <div className="size-8 border-3 border-foreground border-t-transparent rounded-full animate-spin" />
        <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[50vh]"
        {...tid("product-detail-page")}
      >
        <p className="font-display text-lg font-extrabold uppercase tracking-tight text-destructive">
          {t("loadError")}
        </p>
        <Link
          href="/"
          className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("detail.backToProducts")}
        </Link>
      </div>
    );
  }

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
