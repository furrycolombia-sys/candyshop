import type { ProductSection } from "shared/types";

export interface ProductTemplate {
  id: string;
  name_en: string;
  name_es: string;
  description_en: string | null;
  description_es: string | null;
  sections: ProductSection[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateFormValues {
  name_en: string;
  name_es: string;
  description_en: string;
  description_es: string;
  sections: ProductSection[];
  sort_order: number;
  is_active: boolean;
}
