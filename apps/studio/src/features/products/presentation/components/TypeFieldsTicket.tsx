import { useTranslations } from "next-intl";
import type { UseFormRegister } from "react-hook-form";
import { Input } from "ui";

import type { ProductFormValues } from "@/features/products/domain/validationSchema";

interface TypeFieldsTicketProps {
  register: UseFormRegister<ProductFormValues>;
}

export function TypeFieldsTicket({ register }: TypeFieldsTicketProps) {
  const t = useTranslations("form.typeDetails.ticket");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("venue")}</label>
        <Input
          placeholder={t("venuePlaceholder")}
          {...register("type_details_ticket.venue")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("location")}</label>
        <Input
          placeholder={t("locationPlaceholder")}
          {...register("type_details_ticket.location")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("doorsOpen")}</label>
        <Input
          placeholder={t("doorsOpenPlaceholder")}
          {...register("type_details_ticket.doors_open")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("ageRestriction")}</label>
        <Input
          placeholder={t("ageRestrictionPlaceholder")}
          {...register("type_details_ticket.age_restriction")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("capacity")}</label>
        <Input
          type="number"
          min={1}
          placeholder={t("capacityPlaceholder")}
          {...register("type_details_ticket.capacity")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("ticketsRemaining")}</label>
        <Input
          type="number"
          min={0}
          placeholder={t("ticketsRemainingPlaceholder")}
          {...register("type_details_ticket.tickets_remaining")} // eslint-disable-line i18next/no-literal-string -- form field path
        />
      </div>
    </div>
  );
}
