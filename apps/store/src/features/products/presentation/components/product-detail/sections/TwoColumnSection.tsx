import { useLocale } from "next-intl";
import { i18nField, tid } from "shared";
import type { ProductSection } from "shared/types";

import type { CategoryTheme } from "@/features/products/domain/constants";

const MODULO_ZEBRA = 2;

interface TwoColumnSectionProps {
  section: ProductSection;
  theme: CategoryTheme;
}

export function TwoColumnSection({ section, theme }: TwoColumnSectionProps) {
  const locale = useLocale();
  const name = i18nField(section, "name", locale);
  const sorted = [...section.items].sort((a, b) => a.sort_order - b.sort_order);

  if (sorted.length === 0) return null;

  return (
    <section
      className="w-full bg-background border-b-[3px] border-foreground"
      {...tid("two-column-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        {name && (
          <h2
            className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
            {...tid("two-column-section-title")}
          >
            {name}
          </h2>
        )}
        <div
          className={`border-[3px] ${theme.border} nb-shadow-sm overflow-hidden`}
          {...tid("two-column-table")}
        >
          {sorted.map((item, index) => {
            const label = i18nField(item, "title", locale);
            const value = i18nField(item, "description", locale);
            return (
              <div
                key={label || index}
                className={`flex items-stretch border-b-[3px] border-foreground last:border-b-0 ${index % MODULO_ZEBRA === 0 ? theme.rowEven : theme.rowOdd}`}
                {...tid(`two-column-row-${index}`)}
              >
                <div className="w-1/3 shrink-0 px-5 py-3 border-r-[3px] border-foreground">
                  <span className="text-sm font-bold uppercase tracking-wide">
                    {label}
                  </span>
                </div>
                <div className="flex-1 px-5 py-3">
                  <span className="text-sm">{value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
