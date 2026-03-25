import { useLocale, useTranslations } from "next-intl";
import { i18nField, tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { ProductHighlight } from "@/features/products/domain/types";
import { getIcon } from "@/features/products/presentation/components/product-detail/lucideIconMap";

interface HighlightsSectionProps {
  highlights: ProductHighlight[];
  theme: CategoryTheme;
}

export function HighlightsSection({
  highlights,
  theme,
}: HighlightsSectionProps) {
  const t = useTranslations("products");
  const locale = useLocale();

  if (highlights.length === 0) return null;

  return (
    <section
      className="w-full bg-background border-b-[3px] border-foreground"
      {...tid("highlights-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2
          className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
          {...tid("highlights-title")}
        >
          {t("detail.highlights")}
        </h2>
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          {...tid("highlights-grid")}
        >
          {highlights.map((highlight, index) => {
            const Icon = getIcon(highlight.icon);
            const title = i18nField(highlight, "title", locale);
            const description = i18nField(highlight, "description", locale);
            return (
              <div
                key={title}
                className={`flex flex-col gap-3 p-5 border-[3px] ${theme.border} nb-shadow-sm bg-background`}
                {...tid(`highlight-card-${index}`)}
              >
                <div
                  className={`p-2 ${theme.bg} border-[3px] border-foreground w-fit nb-shadow-sm`}
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
