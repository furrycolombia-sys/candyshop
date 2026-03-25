"use client";

import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { tid } from "shared";

import { TypeDetailField } from "./TypeDetailField";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

/** Field definition for each product type's detail fields */
interface FieldDef {
  name: string;
  labelKey: string;
  placeholderKey: string;
  type: "text" | "number" | "boolean";
}

const MERCH_FIELDS: FieldDef[] = [
  {
    name: "weight",
    labelKey: "weight",
    placeholderKey: "weightPlaceholder",
    type: "text",
  },
  {
    name: "dimensions",
    labelKey: "dimensions",
    placeholderKey: "dimensionsPlaceholder",
    type: "text",
  },
  {
    name: "ships_from",
    labelKey: "shipsFrom",
    placeholderKey: "shipsFromPlaceholder",
    type: "text",
  },
  {
    name: "material",
    labelKey: "material",
    placeholderKey: "materialPlaceholder",
    type: "text",
  },
  {
    name: "care_instructions",
    labelKey: "careInstructions",
    placeholderKey: "careInstructionsPlaceholder",
    type: "text",
  },
];

const DIGITAL_FIELDS: FieldDef[] = [
  {
    name: "file_size",
    labelKey: "fileSize",
    placeholderKey: "fileSizePlaceholder",
    type: "text",
  },
  {
    name: "format",
    labelKey: "format",
    placeholderKey: "formatPlaceholder",
    type: "text",
  },
  {
    name: "resolution",
    labelKey: "resolution",
    placeholderKey: "resolutionPlaceholder",
    type: "text",
  },
  {
    name: "license_type",
    labelKey: "licenseType",
    placeholderKey: "licenseTypePlaceholder",
    type: "text",
  },
];

const SERVICE_FIELDS: FieldDef[] = [
  {
    name: "total_slots",
    labelKey: "totalSlots",
    placeholderKey: "totalSlotsPlaceholder",
    type: "number",
  },
  {
    name: "slots_available",
    labelKey: "slotsAvailable",
    placeholderKey: "slotsAvailablePlaceholder",
    type: "number",
  },
  {
    name: "turnaround_days",
    labelKey: "turnaroundDays",
    placeholderKey: "turnaroundDaysPlaceholder",
    type: "number",
  },
  {
    name: "revisions_included",
    labelKey: "revisionsIncluded",
    placeholderKey: "revisionsIncludedPlaceholder",
    type: "number",
  },
  {
    name: "commercial_use",
    labelKey: "commercialUse",
    placeholderKey: "commercialUse",
    type: "boolean",
  },
];

const TICKET_FIELDS: FieldDef[] = [
  {
    name: "venue",
    labelKey: "venue",
    placeholderKey: "venuePlaceholder",
    type: "text",
  },
  {
    name: "location",
    labelKey: "location",
    placeholderKey: "locationPlaceholder",
    type: "text",
  },
  {
    name: "doors_open",
    labelKey: "doorsOpen",
    placeholderKey: "doorsOpenPlaceholder",
    type: "text",
  },
  {
    name: "age_restriction",
    labelKey: "ageRestriction",
    placeholderKey: "ageRestrictionPlaceholder",
    type: "text",
  },
  {
    name: "capacity",
    labelKey: "capacity",
    placeholderKey: "capacityPlaceholder",
    type: "number",
  },
  {
    name: "tickets_remaining",
    labelKey: "ticketsRemaining",
    placeholderKey: "ticketsRemainingPlaceholder",
    type: "number",
  },
];

const FIELDS_BY_TYPE: Record<string, FieldDef[]> = {
  merch: MERCH_FIELDS,
  digital: DIGITAL_FIELDS,
  service: SERVICE_FIELDS,
  ticket: TICKET_FIELDS,
};

const TYPE_DETAILS_PREFIX: Record<string, string> = {
  merch: "type_details_merch",
  digital: "type_details_digital",
  service: "type_details_service",
  ticket: "type_details_ticket",
};

interface InlineTypeDetailsProps {
  control: Control<ProductFormValues>;
  productType: string;
}

export function InlineTypeDetails({
  control,
  productType,
}: InlineTypeDetailsProps) {
  const tInline = useTranslations("form.inlineEditor");
  const tType = useTranslations("form.typeDetails");

  const fieldDefs = FIELDS_BY_TYPE[productType];
  const prefix = TYPE_DETAILS_PREFIX[productType];

  if (!fieldDefs || !prefix) return null;

  const typeKey = productType as keyof typeof FIELDS_BY_TYPE;

  return (
    <section className="w-full" {...tid("inline-type-details")}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-6 font-display text-lg font-extrabold uppercase tracking-wider">
          {tInline("sections.typeDetails")}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fieldDefs.map((fieldDef) => (
            <TypeDetailField
              key={fieldDef.name}
              control={control}
              fieldPath={
                `${prefix}.${fieldDef.name}` as keyof ProductFormValues
              }
              label={tType(`${typeKey}.${fieldDef.labelKey}`)}
              placeholder={tType(`${typeKey}.${fieldDef.placeholderKey}`)}
              type={fieldDef.type}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
