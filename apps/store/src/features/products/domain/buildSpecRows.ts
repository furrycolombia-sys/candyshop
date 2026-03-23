import type { ProductSpec } from "@/features/products/domain/types";

type TFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export function buildCommissionRows(
  t: TFn,
  commission: {
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
        available: commission.slotsAvailable,
        total: commission.totalSlots,
      }),
    },
    {
      label: t("detail.turnaround"),
      value: t("turnaround", { days: commission.turnaroundDays }),
    },
  ];
  if (commission.revisionsIncluded !== undefined) {
    rows.push({
      label: t("detail.revisions"),
      value: String(commission.revisionsIncluded),
    });
  }
  if (commission.commercialUse !== undefined) {
    rows.push({
      label: t("detail.commercialUse"),
      value: commission.commercialUse
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

export function buildPhysicalRows(
  t: TFn,
  physical: {
    weight?: string;
    dimensions?: string;
    material?: string;
    shipsFrom?: string;
    careInstructions?: string;
  },
): ProductSpec[] {
  const rows: ProductSpec[] = [];
  if (physical.weight) {
    rows.push({ label: t("detail.weight"), value: physical.weight });
  }
  if (physical.dimensions) {
    rows.push({ label: t("detail.dimensions"), value: physical.dimensions });
  }
  if (physical.material) {
    rows.push({ label: t("detail.material"), value: physical.material });
  }
  if (physical.shipsFrom) {
    rows.push({ label: t("detail.shipsFrom"), value: physical.shipsFrom });
  }
  if (physical.careInstructions) {
    rows.push({
      label: t("detail.careInstructions"),
      value: physical.careInstructions,
    });
  }
  return rows;
}
