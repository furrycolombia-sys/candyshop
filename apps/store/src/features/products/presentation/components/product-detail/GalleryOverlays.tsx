import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { GalleryView } from "@/features/products/domain/galleryTypes";
import {
  isProductAvailable,
  type Product,
} from "@/features/products/domain/types";

interface GalleryOverlaysProps {
  product: Product;
  theme: CategoryTheme;
  activeView: GalleryView | undefined;
  activeIndex: number;
  totalViews: number;
  t: (key: string) => string;
}

/** Shared overlays for main image (dot texture, label, counter, badges) */
export function GalleryOverlays({
  product,
  theme,
  activeView,
  activeIndex,
  totalViews,
  t,
}: GalleryOverlaysProps) {
  return (
    <>
      {/* Dot texture */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "20px 20px",
        }}
      />

      {/* View label watermark */}
      <span className="relative font-display text-4xl font-extrabold uppercase tracking-widest text-foreground/10 select-none text-center px-6">
        {activeView?.label}
      </span>

      {/* Counter */}
      <div className="absolute bottom-2 right-2 bg-foreground text-background text-tiny font-bold px-2 py-0.5 tracking-widest">
        {activeIndex + 1} / {totalViews}
      </div>

      {/* Featured */}
      {product.featured && (
        <span
          className={`absolute top-2 left-2 ${theme.bg} border-3 border-foreground text-foreground text-tiny font-bold uppercase tracking-widest px-2 py-0.5`}
          {...tid("hero-featured-badge")}
        >
          {t("featured")}
        </span>
      )}

      {/* Out of stock */}
      {!isProductAvailable(product) && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/70 z-10">
          <span className="font-display text-xl font-extrabold uppercase tracking-widest text-background">
            {t("outOfStock")}
          </span>
        </div>
      )}
    </>
  );
}
