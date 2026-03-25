import type { ProductSpec } from "@/features/products/domain/types";

type TFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export function buildServiceRows(
  t: TFn,
  service: {
    totalSlots: number;
    slotsAvailable: number;
    turnaroundDays: number;
    revisionsIncluded?: number;
    commercialUse?: boolean;
  },
): ProductSpec[] {
  const rows: ProductSpec[] = [
    {
      label: t("detail.slots"),
      value: t("slotsAvailable", {
        available: service.slotsAvailable,
        total: service.totalSlots,
      }),
    },
    {
      label: t("detail.turnaround"),
      value: t("turnaround", { days: service.turnaroundDays }),
    },
  ];
  if (service.revisionsIncluded !== undefined) {
    rows.push({
      label: t("detail.revisions"),
      value: String(service.revisionsIncluded),
    });
  }
  if (service.commercialUse !== undefined) {
    rows.push({
      label: t("detail.commercialUse"),
      value: service.commercialUse
        ? t("detail.commercialUseYes")
        : t("detail.commercialUseNo"),
    });
  }
  return rows;
}

export function buildTicketRows(
  t: TFn,
  ticket: {
    date: string;
    venue: string;
    location?: string;
    ticketsRemaining: number;
    doorsOpen?: string;
    ageRestriction?: string;
  },
): ProductSpec[] {
  const rows: ProductSpec[] = [
    { label: t("detail.date"), value: ticket.date },
    { label: t("detail.venue"), value: ticket.venue },
  ];
  if (ticket.location) {
    rows.push({ label: t("detail.location"), value: ticket.location });
  }
  rows.push({
    label: t("detail.ticketsLeft"),
    value: t("ticketsRemaining", { remaining: ticket.ticketsRemaining }),
  });
  if (ticket.doorsOpen) {
    rows.push({ label: t("detail.doorsOpen"), value: ticket.doorsOpen });
  }
  if (ticket.ageRestriction) {
    rows.push({
      label: t("detail.ageRestriction"),
      value: ticket.ageRestriction,
    });
  }
  return rows;
}

export function buildDigitalRows(
  t: TFn,
  digital: {
    format: string;
    fileSize: string;
    resolution?: string;
    licenseType?: string;
  },
): ProductSpec[] {
  const rows: ProductSpec[] = [
    { label: t("detail.format"), value: digital.format },
    { label: t("detail.fileSize"), value: digital.fileSize },
  ];
  if (digital.resolution) {
    rows.push({ label: t("detail.resolution"), value: digital.resolution });
  }
  if (digital.licenseType) {
    rows.push({ label: t("detail.license"), value: digital.licenseType });
  }
  rows.push({ label: t("detail.delivery"), value: t("digital") });
  return rows;
}

export function buildMerchRows(
  t: TFn,
  merch: {
    weight?: string;
    dimensions?: string;
    material?: string;
    shipsFrom?: string;
    careInstructions?: string;
  },
): ProductSpec[] {
  const rows: ProductSpec[] = [];
  if (merch.weight) {
    rows.push({ label: t("detail.weight"), value: merch.weight });
  }
  if (merch.dimensions) {
    rows.push({ label: t("detail.dimensions"), value: merch.dimensions });
  }
  if (merch.material) {
    rows.push({ label: t("detail.material"), value: merch.material });
  }
  if (merch.shipsFrom) {
    rows.push({ label: t("detail.shipsFrom"), value: merch.shipsFrom });
  }
  if (merch.careInstructions) {
    rows.push({
      label: t("detail.careInstructions"),
      value: merch.careInstructions,
    });
  }
  return rows;
}
