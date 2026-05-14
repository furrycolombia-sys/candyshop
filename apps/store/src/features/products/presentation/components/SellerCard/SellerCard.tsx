"use client";

import { useLocale, useTranslations } from "next-intl";
import { appUrls, tid } from "shared";
import { Avatar, AvatarFallback, AvatarImage } from "ui";

import { useSellerInfo } from "@/features/products/application/hooks/useSellerInfo";

interface SellerCardProps {
  sellerId: string | null;
}

export function SellerCard({ sellerId }: SellerCardProps) {
  const t = useTranslations("products");
  const locale = useLocale();
  const { data, isLoading } = useSellerInfo(sellerId);

  if (!sellerId || isLoading || !data) return null;

  const profileUrl = `${appUrls.auth}/${locale}/profile/${sellerId}`;
  const initial = data.displayName.charAt(0).toUpperCase();

  return (
    <section
      className="mx-auto w-full max-w-6xl px-4 py-6"
      {...tid("seller-card")}
    >
      <h2
        className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4"
        {...tid("seller-card-title")}
      >
        {t("detail.seller")}
      </h2>

      <div className="flex items-center gap-3">
        <Avatar className="size-10">
          {data.avatarUrl ? (
            <AvatarImage src={data.avatarUrl} alt={data.displayName} />
          ) : null}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className="font-display text-sm/tight font-semibold truncate"
            {...tid("seller-name")}
          >
            {data.displayName}
          </span>

          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            {...tid("seller-profile-link")}
          >
            {t("detail.viewProfile")}
          </a>
        </div>
      </div>
    </section>
  );
}
