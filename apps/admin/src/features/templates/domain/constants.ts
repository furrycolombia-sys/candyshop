import type { TemplateFormValues } from "./types";

export const TEMPLATES_QUERY_KEY = "product-templates";
export const TEMPLATES_STALE_TIME_MS = 30_000;

export const TEMPLATE_FORM_DEFAULTS: TemplateFormValues = {
  name_en: "",
  name_es: "",
  description_en: "",
  description_es: "",
  sections: [],
  sort_order: 0,
  is_active: true,
};
