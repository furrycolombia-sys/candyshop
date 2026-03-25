import { useTranslations } from "next-intl";
import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";

interface DescriptionSectionProps {
  description: string;
  theme: CategoryTheme;
}

export function DescriptionSection({
  description,
  // Description stays neutral for maximum readability; theme is accepted for API consistency
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  theme: _theme,
}: DescriptionSectionProps) {
  const t = useTranslations("products");
  const paragraphs = description.split("\n\n").filter(Boolean);

  return (
    <section
      className="w-full bg-dots border-b-[3px] border-foreground"
      {...tid("description-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2
          className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
          {...tid("description-title")}
        >
          {t("detail.about")}
        </h2>
        <div
          className="max-w-prose flex flex-col gap-5"
          {...tid("description-body")}
        >
          {paragraphs.map((para) => (
            <p
              key={`${para.length}-${para.codePointAt(0)}-${para.codePointAt(para.length - 1)}`}
              className="text-base/loose"
            >
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
