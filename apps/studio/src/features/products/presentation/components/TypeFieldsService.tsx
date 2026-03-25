"use client";

import { useTranslations } from "next-intl";
import type {
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Input, Switch } from "ui";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

const COMMERCIAL_USE_PATH = "type_details_service.commercial_use" as const;

interface TypeFieldsServiceProps {
  register: UseFormRegister<ProductFormValues>;
  watch: UseFormWatch<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
}

export function TypeFieldsService({
  register,
  watch,
  setValue,
}: TypeFieldsServiceProps) {
  const t = useTranslations("form.typeDetails.service");
  const commercialUse = watch(COMMERCIAL_USE_PATH);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("totalSlots")}</label>
        <Input
          type="number"
          min={1}
          placeholder={t("totalSlotsPlaceholder")}
          {...register("type_details_service.total_slots")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("slotsAvailable")}</label>
        <Input
          type="number"
          min={0}
          placeholder={t("slotsAvailablePlaceholder")}
          {...register("type_details_service.slots_available")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("turnaroundDays")}</label>
        <Input
          type="number"
          min={1}
          placeholder={t("turnaroundDaysPlaceholder")}
          {...register("type_details_service.turnaround_days")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("revisionsIncluded")}</label>
        <Input
          type="number"
          min={0}
          placeholder={t("revisionsIncludedPlaceholder")}
          {...register("type_details_service.revisions_included")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Switch
          checked={commercialUse ?? false}
          onCheckedChange={(checked) =>
            setValue(COMMERCIAL_USE_PATH, !!checked)
          }
        />
        <label className="text-sm font-medium">{t("commercialUse")}</label>
      </div>
    </div>
  );
}
