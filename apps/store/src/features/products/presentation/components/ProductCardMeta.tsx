"use client";

import { useTranslations } from "next-intl";

import type { Product } from "@/features/products/domain/types";

interface ProductCardMetaProps {
  product: Product;
}

/** Renders type-specific metadata (slots, tickets, digital label, ships-from). */
export function ProductCardMeta({ product }: ProductCardMetaProps) {
  const t = useTranslations("products");

  if (product.type === "service" && product.service) {
    return (
      <p>
        {t("slotsAvailable", {
          available: product.service.slotsAvailable,
          total: product.service.totalSlots,
        })}
      </p>
    );
  }
  if (product.type === "ticket" && product.ticket) {
    return (
      <p>
        {t("ticketsRemaining", {
          remaining: product.ticket.ticketsRemaining,
        })}
      </p>
    );
  }
  if (product.type === "digital") {
    return <p>{t("digital")}</p>;
  }
  if (product.type === "merch" && product.merch?.shipsFrom) {
    return <p>{t("shipsFrom", { location: product.merch.shipsFrom })}</p>;
  }
  return null;
}
