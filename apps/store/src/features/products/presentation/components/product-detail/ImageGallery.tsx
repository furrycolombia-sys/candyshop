"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { tid } from "shared";

import { GalleryOverlays } from "./GalleryOverlays";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { GalleryView } from "@/features/products/domain/galleryTypes";
import type { Product } from "@/features/products/domain/types";

interface ImageGalleryProps {
  product: Product;
  theme: CategoryTheme;
}

/* eslint-disable sonarjs/no-duplicate-string -- i18n translation keys */
function getProductViews(
  product: Product,
  tTypes: (key: string) => string,
  tGallery: (key: string) => string,
): GalleryView[] {
  if (product.type === "merch") {
    return [
      { label: tTypes(product.type), index: 0 },
      { label: tGallery("views.detail"), index: 1 },
      { label: tGallery("views.sideView"), index: 2 },
      { label: tGallery("views.scale"), index: 3 },
      { label: tGallery("views.package"), index: 4 },
    ];
  }
  if (product.type === "service") {
    return [
      { label: tGallery("views.example"), index: 0 },
      { label: tGallery("views.process"), index: 1 },
      { label: tGallery("views.style"), index: 2 },
      { label: tGallery("views.detail"), index: 3 },
    ];
  }
  if (product.type === "ticket") {
    return [
      { label: tGallery("views.venue"), index: 0 },
      { label: tGallery("views.map"), index: 1 },
      { label: tGallery("views.lineup"), index: 2 },
      { label: tGallery("views.vibes"), index: 3 },
    ];
  }
  return [
    { label: tTypes(product.type), index: 0 },
    { label: tGallery("views.detail"), index: 1 },
    { label: tGallery("views.preview"), index: 2 },
  ];
}
/* eslint-enable sonarjs/no-duplicate-string */

/** Rotation angles (degrees) for placeholder gradient variety */
// eslint-disable-next-line @typescript-eslint/no-magic-numbers -- CSS rotation values
const GRADIENT_ANGLES = [135, 225, 315, 45, 180] as const;

/**
 * Product image gallery.
 *
 * Desktop: vertical thumbnail strip LEFT + main image RIGHT (Shopify pattern).
 * Mobile: main image on top, horizontal thumbnail row below.
 */
export function ImageGallery({ product, theme }: ImageGalleryProps) {
  const tTypes = useTranslations("productTypes");
  const t = useTranslations("products");
  const tGallery = useTranslations("products.gallery");
  const views = getProductViews(product, tTypes, tGallery);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeView = views[activeIndex];
  const angle = GRADIENT_ANGLES[activeIndex % GRADIENT_ANGLES.length];
  // eslint-disable-next-line i18next/no-literal-string -- CSS gradient value
  const gradientStyle = `linear-gradient(${String(angle)}deg, var(${theme.accent}), var(${theme.accent}) 60%, transparent)`;

  const thumbInactive =
    "border-foreground/20 bg-background hover:border-foreground";
  const viewImageLabel = (label: string) =>
    tGallery("views.viewImage", { label });

  return (
    <div className="w-full lg:w-3/5 shrink-0" {...tid("image-gallery")}>
      {/* Desktop: thumbnails left + image right */}
      <div className="hidden lg:flex gap-3">
        {/* Vertical thumbnails */}
        {views.length > 1 && (
          <div
            className="flex flex-col gap-2 shrink-0"
            {...tid("image-gallery-thumbs")}
          >
            {views.map((view) => {
              const isActive = view.index === activeIndex;
              const activeCls = isActive
                ? `border-foreground ${theme.bg} nb-shadow-sm`
                : thumbInactive;
              return (
                <button
                  key={view.index}
                  onClick={() => setActiveIndex(view.index)}
                  className={`flex items-center justify-center size-16 border-3 transition-all ${activeCls}`}
                  aria-label={viewImageLabel(view.label)}
                  {...tid(`image-gallery-thumb-${String(view.index)}`)}
                >
                  <span className="font-display text-[8px] font-extrabold uppercase tracking-wide leading-tight text-center px-0.5">
                    {view.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main image — fills remaining width */}
        <div
          className={`relative flex-1 flex items-center justify-center aspect-square border-3 border-foreground nb-shadow-lg overflow-hidden ${theme.bg}`}
          style={{ backgroundImage: gradientStyle }}
          {...tid("image-gallery-main")}
        >
          <GalleryOverlays
            product={product}
            theme={theme}
            activeView={activeView}
            activeIndex={activeIndex}
            totalViews={views.length}
            t={t}
          />
        </div>
      </div>

      {/* Mobile: image on top, thumbnails below */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div
          className={`relative flex items-center justify-center aspect-square border-3 border-foreground nb-shadow-lg overflow-hidden ${theme.bg}`}
          style={{ backgroundImage: gradientStyle }}
          {...tid("image-gallery-main-mobile")}
        >
          <GalleryOverlays
            product={product}
            theme={theme}
            activeView={activeView}
            activeIndex={activeIndex}
            totalViews={views.length}
            t={t}
          />
        </div>

        {views.length > 1 && (
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${String(views.length)}, 1fr)`,
            }}
          >
            {views.map((view) => {
              const isActive = view.index === activeIndex;
              const activeCls = isActive
                ? `border-foreground ${theme.bg} nb-shadow-sm`
                : thumbInactive;
              return (
                <button
                  key={view.index}
                  onClick={() => setActiveIndex(view.index)}
                  className={`flex items-center justify-center py-2 border-3 transition-all ${activeCls}`}
                  aria-label={viewImageLabel(view.label)}
                >
                  <span className="font-display text-[9px] font-extrabold uppercase tracking-wide truncate px-1">
                    {view.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
