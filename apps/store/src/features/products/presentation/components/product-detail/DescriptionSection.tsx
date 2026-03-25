import { useTranslations } from "next-intl";
import { tid } from "shared";

interface DescriptionSectionProps {
  description: string;
}

export function DescriptionSection({ description }: DescriptionSectionProps) {
  const t = useTranslations("products");
  const paragraphs = description.split("\n\n").filter(Boolean);

  return (
    <section
      className="w-full bg-dots border-b-3 border-foreground"
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
          {paragraphs.map((para, idx) => (
            // eslint-disable-next-line react/no-array-index-key -- paragraphs from static split text, never reorder
            <p key={idx} className="text-base/loose">
              {para}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
