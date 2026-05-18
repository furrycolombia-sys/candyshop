"use client";

import { useLocale } from "next-intl";
import { appUrls, tid } from "shared";
import { Avatar, AvatarFallback, AvatarImage } from "ui";

import { useSellerInfo } from "@/features/products/application/hooks/useSellerInfo";

interface SellerCardProps {
  sellerId: string | null;
}

export function SellerCard({ sellerId }: SellerCardProps) {
  const locale = useLocale();
  const { data, isLoading } = useSellerInfo(sellerId);

  if (!sellerId || isLoading || !data) return null;

  const profileUrl = `${appUrls.auth}/${locale}/profile/${sellerId}`;
  const initial = data.displayName.charAt(0).toUpperCase();

  return (
    <a
      href={profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-w-0 items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      {...tid("seller-card")}
    >
      <Avatar className="size-6 shrink-0">
        {data.avatarUrl ? (
          <AvatarImage src={data.avatarUrl} alt={data.displayName} />
        ) : null}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
      <span
        className="font-display text-xs font-bold uppercase tracking-widest truncate"
        {...tid("seller-name")}
      >
        {data.displayName}
      </span>
    </a>
  );
}
