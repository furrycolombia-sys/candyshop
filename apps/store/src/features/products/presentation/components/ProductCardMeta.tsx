"use client";

import { useTranslations } from "next-intl";
import {
  typeDetails,
  type MerchDetails,
  type ServiceDetails,
  type TicketDetails,
} from "shared";

import type { Product } from "@/features/products/domain/types";

interface ProductCardMetaProps {
  product: Product;
}

/** Renders type-specific metadata (slots, tickets, digital label, ships-from). */
export function ProductCardMeta({ product }: ProductCardMetaProps) {
  const t = useTranslations("products");

  if (product.type === "service") {
    const details = typeDetails<ServiceDetails>(product);
    if (details.total_slots) {
      return (
        <p>
          {t("slotsAvailable", {
            available: details.slots_available ?? 0,
            total: details.total_slots,
          })}
        </p>
      );
    }
  }
  if (product.type === "ticket") {
    const details = typeDetails<TicketDetails>(product);
    if (details.tickets_remaining) {
      return (
        <p>
          {t("ticketsRemaining", {
            remaining: details.tickets_remaining,
          })}
        </p>
      );
    }
  }
  if (product.type === "digital") {
    return <p>{t("digital")}</p>;
  }
  if (product.type === "merch") {
    const details = typeDetails<MerchDetails>(product);
    if (details.ships_from) {
      return <p>{t("shipsFrom", { location: details.ships_from })}</p>;
    }
  }
  return null;
}
