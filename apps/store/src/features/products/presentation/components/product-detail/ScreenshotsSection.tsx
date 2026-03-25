import { useLocale, useTranslations } from "next-intl";
import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { ProductScreenshot } from "@/features/products/domain/types";

interface ScreenshotsSectionProps {
  screenshots: ProductScreenshot[];
  theme: CategoryTheme;
}

export function ScreenshotsSection({
  screenshots,
  theme,
}: ScreenshotsSectionProps) {
  const t = useTranslations("products");
  const locale = useLocale();

  if (screenshots.length === 0) return null;

  return (
    <section
      className={`w-full ${theme.bgLight} border-b-[3px] border-foreground`}
      {...tid("screenshots-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2
          className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
          {...tid("screenshots-title")}
        >
          {t("detail.gallery")}
        </h2>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div
          className="flex lg:grid lg:grid-cols-3 gap-4 overflow-x-auto pb-4 lg:pb-0 snap-x snap-mandatory lg:snap-none"
          {...tid("screenshots-gallery")}
        >
          {screenshots.map((screenshot, index) => {
            const caption =
              locale === "es"
                ? (screenshot.caption_es ?? screenshot.caption_en)
                : (screenshot.caption_en ?? screenshot.caption_es);
            return (
              <div
                key={caption ?? screenshot.url ?? index}
                className="flex flex-col gap-2 shrink-0 w-64 lg:w-auto snap-start"
                {...tid(`screenshot-${index}`)}
              >
                <div
                  className={`${theme.bg} border-[3px] border-foreground nb-shadow-sm flex items-center justify-center h-44`}
                >
                  <span className="font-display text-sm font-extrabold uppercase tracking-widest text-foreground/30 select-none">
                    {index + 1}
                  </span>
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
