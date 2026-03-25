import { useTranslations } from "next-intl";
import type { UseFormRegister } from "react-hook-form";
import { Input } from "ui";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface TypeFieldsMerchProps {
  register: UseFormRegister<ProductFormValues>;
}

export function TypeFieldsMerch({ register }: TypeFieldsMerchProps) {
  const t = useTranslations("form.typeDetails.merch");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("weight")}</label>
        <Input
          placeholder={t("weightPlaceholder")}
          {...register("type_details_merch.weight")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("dimensions")}</label>
        <Input
          placeholder={t("dimensionsPlaceholder")}
          {...register("type_details_merch.dimensions")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("shipsFrom")}</label>
        <Input
          placeholder={t("shipsFromPlaceholder")}
          {...register("type_details_merch.ships_from")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("material")}</label>
        <Input
          placeholder={t("materialPlaceholder")}
          {...register("type_details_merch.material")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-sm font-medium">{t("careInstructions")}</label>
        <Input
          placeholder={t("careInstructionsPlaceholder")}
          {...register("type_details_merch.care_instructions")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
    </div>
  );
}
