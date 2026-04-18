import { useLocale } from "next-intl";
import { useMemo } from "react";
import { i18nField, tid } from "shared";
import type { ProductSection } from "shared/types";

import type { CategoryTheme } from "@/features/products/domain/constants";
import {
  DEFAULT_ICON_NAME,
  getIcon,
} from "@/features/products/presentation/components/product-detail/lucideIconMap";

interface CardsSectionProps {
  section: ProductSection;
  theme: CategoryTheme;
}

export function CardsSection({ section, theme }: CardsSectionProps) {
  const locale = useLocale();
  const name = i18nField(section, "name", locale);
  const sorted = useMemo(
    () => [...section.items].sort((a, b) => a.sort_order - b.sort_order),
    [section.items],
  );

  if (sorted.length === 0) return null;

  return (
    <section
      className="w-full bg-background border-b-strong border-foreground"
      {...tid("cards-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        {name && (
          <h2
            className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
            {...tid("cards-section-title")}
          >
            {name}
          </h2>
        )}
        <div
          className="flex gap-4 overflow-x-auto pb-4 lg:pb-0 lg:grid lg:grid-cols-4"
          {...tid("cards-grid")}
        >
          {sorted.map((item, index) => {
            const Icon = getIcon(item.icon ?? DEFAULT_ICON_NAME);
            const title = i18nField(item, "title", locale);
            const description = i18nField(item, "description", locale);
            return (
              <div
                key={title || index}
                className="flex w-56 shrink-0 flex-col gap-3 border-strong bg-background p-5 shadow-brutal-sm lg:w-auto"
                style={{ borderColor: theme.border }}
                {...tid(`card-item-${index}`)}
              >
                <div
                  className="w-fit border-strong border-foreground p-2 shadow-brutal-sm"
                  style={{ backgroundColor: theme.bg }}
                >
                  <Icon className="size-6" />
                </div>
                <p className="font-display text-sm/tight font-extrabold uppercase tracking-wide">
                  {title}
                </p>
                <p className="text-xs/relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
