import { useTranslations } from "next-intl";
import type { UseFormRegister } from "react-hook-form";
import { Input } from "ui";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface TypeFieldsDigitalProps {
  register: UseFormRegister<ProductFormValues>;
}

export function TypeFieldsDigital({ register }: TypeFieldsDigitalProps) {
  const t = useTranslations("form.typeDetails.digital");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("fileSize")}</label>
        <Input
          placeholder={t("fileSizePlaceholder")}
          {...register("type_details_digital.file_size")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("format")}</label>
        <Input
          placeholder={t("formatPlaceholder")}
          {...register("type_details_digital.format")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("resolution")}</label>
        <Input
          placeholder={t("resolutionPlaceholder")}
          {...register("type_details_digital.resolution")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("licenseType")}</label>
        <Input
          placeholder={t("licenseTypePlaceholder")}
          {...register("type_details_digital.license_type")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
    </div>
  );
}
