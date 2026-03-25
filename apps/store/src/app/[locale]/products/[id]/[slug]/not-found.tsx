import { useTranslations } from "next-intl";

import { Link } from "@/shared/infrastructure/i18n";

export default function NotFound() {
  const t = useTranslations("products");

  return (
    <div className="flex-1 bg-dots flex items-center justify-center p-8">
      <div className="border-[3px] border-foreground nb-shadow-md bg-background p-10 max-w-md w-full text-center">
        <p className="font-display text-8xl font-extrabold text-foreground/10 select-none mb-4">
          404
        </p>
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-wide mb-2">
          {t("detail.notFound")}
        </h1>
        <p className="text-muted-foreground mb-8">{t("detail.notFoundHint")}</p>
        <Link
          href="/"
          className="inline-block nb-btn nb-btn-press-sm font-bold uppercase tracking-widest"
        >
          {t("detail.backToProducts")}
        </Link>
      </div>
    </div>
  );
}
