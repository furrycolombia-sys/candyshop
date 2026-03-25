import { useLocale, useTranslations } from "next-intl";
import { i18nField, tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { ProductFaq } from "@/features/products/domain/types";
import { FaqItem } from "@/features/products/presentation/components/product-detail/FaqItem";

interface FaqSectionProps {
  faq: ProductFaq[];
  theme: CategoryTheme;
}

export function FaqSection({ faq, theme }: FaqSectionProps) {
  const t = useTranslations("products");
  const locale = useLocale();

  if (faq.length === 0) return null;

  return (
    <section
      className="w-full bg-dots border-b-[3px] border-foreground"
      {...tid("faq-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2
          className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
          {...tid("faq-title")}
        >
          {t("detail.faq")}
        </h2>
        <div className="flex flex-col gap-3" {...tid("faq-list")}>
          {faq.map((item, index) => (
            <FaqItem
              key={i18nField(item, "question", locale)}
              question={i18nField(item, "question", locale)}
              answer={i18nField(item, "answer", locale)}
              index={index}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
