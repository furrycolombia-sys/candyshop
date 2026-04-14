export interface ProductSection {
  name_en: string;
  name_es: string;
  type: SectionType;
  sort_order: number;
  items: ProductSectionItem[];
}

export interface ProductSectionItem {
  title_en: string;
  title_es: string;
  description_en: string;
  description_es: string;
  icon?: string;
  image_url?: string;
  sort_order: number;
}

export const SECTION_TYPES = [
  "cards",
  "accordion",
  "two-column",
  "gallery",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
