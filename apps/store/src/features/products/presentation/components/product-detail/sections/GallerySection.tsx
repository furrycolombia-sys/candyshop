import Image from "next/image";
import { useLocale } from "next-intl";
import { i18nField, tid } from "shared";
import type { ProductSection } from "shared/types";

import type { CategoryTheme } from "@/features/products/domain/constants";

interface GallerySectionProps {
  section: ProductSection;
  theme: CategoryTheme;
}

export function GallerySection({ section, theme }: GallerySectionProps) {
  const locale = useLocale();
  const name = i18nField(section, "name", locale);
  const sorted = [...section.items].sort((a, b) => a.sort_order - b.sort_order);

  if (sorted.length === 0) return null;

  return (
    <section
      className="w-full border-b-strong border-foreground"
      style={{ backgroundColor: theme.bgLight }}
      {...tid("gallery-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        {name && (
          <h2
            className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
            {...tid("gallery-section-title")}
          >
            {name}
          </h2>
        )}
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          {...tid("gallery-grid")}
        >
          {sorted.map((item, index) => {
            const caption = i18nField(item, "title", locale);
            return (
              <div
                key={caption || index}
                className="flex flex-col gap-2"
                {...tid(`gallery-item-${index}`)}
              >
                <div
                  className="relative flex h-44 items-center justify-center overflow-hidden border-strong border-foreground shadow-brutal-sm"
                  style={{ backgroundColor: theme.bg }}
                >
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={caption || ""}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="font-display text-sm font-extrabold uppercase tracking-widest text-foreground/30 select-none">
                      {index + 1}
                    </span>
                  )}
                </div>
                {caption && (
                  <p className="text-xs text-muted-foreground font-medium px-1">
                    {caption}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
