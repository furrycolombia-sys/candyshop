import { useLocale } from "next-intl";
import { i18nField, tid } from "shared";
import type { ProductSection } from "shared/types";

import type { CategoryTheme } from "@/features/products/domain/constants";
import { AccordionItem } from "@/features/products/presentation/components/product-detail/sections/AccordionItem";

interface AccordionSectionProps {
  section: ProductSection;
  theme: CategoryTheme;
}

export function AccordionSection({ section, theme }: AccordionSectionProps) {
  const locale = useLocale();
  const name = i18nField(section, "name", locale);
  const sorted = [...section.items].sort((a, b) => a.sort_order - b.sort_order);

  if (sorted.length === 0) return null;

  return (
    <section
      className="w-full bg-dots border-b-[3px] border-foreground"
      {...tid("accordion-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        {name && (
          <h2
            className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
            {...tid("accordion-section-title")}
          >
            {name}
          </h2>
        )}
        <div className="flex flex-col gap-3" {...tid("accordion-list")}>
          {sorted.map((item, index) => (
            <AccordionItem
              key={i18nField(item, "title", locale) || index}
              question={i18nField(item, "title", locale)}
              answer={i18nField(item, "description", locale)}
              index={index}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
