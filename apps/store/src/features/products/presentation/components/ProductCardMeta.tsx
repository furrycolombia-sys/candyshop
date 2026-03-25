"use client";

import { useTranslations } from "next-intl";

import type { Product } from "@/features/products/domain/types";

interface ProductCardMetaProps {
  product: Product;
}

/** Renders type-specific metadata (slots, tickets, digital label, ships-from). */
export function ProductCardMeta({ product }: ProductCardMetaProps) {
  const t = useTranslations("products");

  if (product.type === "commission" && product.commission) {
    return (
      <p>
        {t("slotsAvailable", {
          available: product.commission.slotsAvailable,
          total: product.commission.totalSlots,
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
  if (product.type === "physical" && product.physical?.shipsFrom) {
    return <p>{t("shipsFrom", { location: product.physical.shipsFrom })}</p>;
  }
  return null;
}
