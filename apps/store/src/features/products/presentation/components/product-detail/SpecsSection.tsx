import { useTranslations } from "next-intl";
import {
  typeDetails,
  type DigitalDetails,
  type MerchDetails,
  type ServiceDetails,
  type TicketDetails,
} from "shared";
import { tid } from "shared";

import type { CategoryTheme } from "@/features/products/domain/constants";
import type { Product, ProductSpec } from "@/features/products/domain/types";

const MODULO_ZEBRA = 2;

type TFn = ReturnType<typeof useTranslations<"products">>;

interface SpecsSectionProps {
  product: Product;
  theme: CategoryTheme;
}

function buildServiceRows(t: TFn, product: Product): ProductSpec[] {
  const d = typeDetails<ServiceDetails>(product);
  const rows: ProductSpec[] = [];
  if (d.total_slots != null) {
    rows.push({
      label: t("detail.slots"),
      value: t("slotsAvailable", {
        available: d.slots_available ?? 0,
        total: d.total_slots,
      }),
    });
  }
  if (d.turnaround_days != null) {
    rows.push({
      label: t("detail.turnaround"),
      value: t("turnaround", { days: d.turnaround_days }),
    });
  }
  if (d.revisions_included != null) {
    rows.push({
      label: t("detail.revisions"),
      value: String(d.revisions_included),
    });
  }
  if (d.commercial_use != null) {
    rows.push({
      label: t("detail.commercialUse"),
      value: d.commercial_use
        ? t("detail.commercialUseYes")
        : t("detail.commercialUseNo"),
    });
  }
  return rows;
}

function buildTicketRows(t: TFn, product: Product): ProductSpec[] {
  const d = typeDetails<TicketDetails>(product);
  const rows: ProductSpec[] = [];
  if (d.venue) rows.push({ label: t("detail.venue"), value: d.venue });
  if (d.location) {
    rows.push({ label: t("detail.location"), value: d.location });
  }
  if (d.tickets_remaining != null) {
    rows.push({
      label: t("detail.ticketsLeft"),
      value: t("ticketsRemaining", { remaining: d.tickets_remaining }),
    });
  }
  if (d.doors_open) {
    rows.push({ label: t("detail.doorsOpen"), value: d.doors_open });
  }
  if (d.age_restriction) {
    rows.push({
      label: t("detail.ageRestriction"),
      value: d.age_restriction,
    });
  }
  return rows;
}

function buildDigitalRows(t: TFn, product: Product): ProductSpec[] {
  const d = typeDetails<DigitalDetails>(product);
  const rows: ProductSpec[] = [];
  if (d.format) rows.push({ label: t("detail.format"), value: d.format });
  if (d.file_size) {
    rows.push({ label: t("detail.fileSize"), value: d.file_size });
  }
  if (d.resolution) {
    rows.push({ label: t("detail.resolution"), value: d.resolution });
  }
  if (d.license_type) {
    rows.push({ label: t("detail.license"), value: d.license_type });
  }
  rows.push({ label: t("detail.delivery"), value: t("digital") });
  return rows;
}

function buildMerchRows(t: TFn, product: Product): ProductSpec[] {
  const d = typeDetails<MerchDetails>(product);
  const rows: ProductSpec[] = [];
  if (d.weight) rows.push({ label: t("detail.weight"), value: d.weight });
  if (d.dimensions) {
    rows.push({ label: t("detail.dimensions"), value: d.dimensions });
  }
  if (d.material) {
    rows.push({ label: t("detail.material"), value: d.material });
  }
  if (d.ships_from) {
    rows.push({ label: t("detail.shipsFrom"), value: d.ships_from });
  }
  if (d.care_instructions) {
    rows.push({
      label: t("detail.careInstructions"),
      value: d.care_instructions,
    });
  }
  return rows;
}

function getTypeRows(product: Product, t: TFn): ProductSpec[] {
  switch (product.type) {
    case "service": {
      return buildServiceRows(t, product);
    }
    case "ticket": {
      return buildTicketRows(t, product);
    }
    case "digital": {
      return buildDigitalRows(t, product);
    }
    case "merch": {
      return buildMerchRows(t, product);
    }
    default: {
      return [];
    }
  }
}

export function SpecsSection({ product, theme }: SpecsSectionProps) {
  const t = useTranslations("products");
  const allRows = getTypeRows(product, t);

  if (allRows.length === 0) return null;

  return (
    <section
      className="w-full bg-background border-b-[3px] border-foreground"
      {...tid("specs-section")}
    >
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h2
          className="font-display text-2xl font-extrabold uppercase tracking-widest mb-8"
          {...tid("specs-title")}
        >
          {t("detail.specifications")}
        </h2>
        <div
          className={`border-[3px] ${theme.border} nb-shadow-sm overflow-hidden`}
          {...tid("specs-table")}
        >
          {allRows.map((row, index) => (
            <div
              key={row.label}
              className={`flex items-stretch border-b-[3px] border-foreground last:border-b-0 ${index % MODULO_ZEBRA === 0 ? theme.rowEven : theme.rowOdd}`}
              {...tid(`spec-row-${index}`)}
            >
              <div className="w-1/3 shrink-0 px-5 py-3 border-r-[3px] border-foreground">
                <span className="text-sm font-bold uppercase tracking-wide">
                  {row.label}
                </span>
              </div>
              <div className="flex-1 px-5 py-3">
                <span className="text-sm">{row.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
