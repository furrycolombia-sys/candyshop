import type { ProductCategory, ProductType } from "./types";

export const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
  { value: "commission", label: "Commission" },
  { value: "ticket", label: "Ticket" },
];

/** Color theme for each product category — threaded through all detail sections */
export interface CategoryTheme {
  bg: string;
  bgLight: string;
  border: string;
  text: string;
  badgeBg: string;
  rowEven: string;
  rowOdd: string;
  accent: string;
}

export const CATEGORY_THEMES: Record<ProductCategory, CategoryTheme> = {
  fursuits: {
    bg: "bg-(--pink)",
    bgLight: "bg-(--pink)/15",
    border: "border-(--pink)",
    text: "text-(--pink)",
    badgeBg: "bg-(--pink)",
    rowEven: "bg-(--pink)/5",
    rowOdd: "bg-(--pink)/15",
    accent: "--pink",
  },
  merch: {
    bg: "bg-(--mint)",
    bgLight: "bg-(--mint)/15",
    border: "border-(--mint)",
    text: "text-(--mint)",
    badgeBg: "bg-(--mint)",
    rowEven: "bg-(--mint)/5",
    rowOdd: "bg-(--mint)/15",
    accent: "--mint",
  },
  art: {
    bg: "bg-(--lilac)",
    bgLight: "bg-(--lilac)/15",
    border: "border-(--lilac)",
    text: "text-(--lilac)",
    badgeBg: "bg-(--lilac)",
    rowEven: "bg-(--lilac)/5",
    rowOdd: "bg-(--lilac)/15",
    accent: "--lilac",
  },
  events: {
    bg: "bg-(--lemon)",
    bgLight: "bg-(--lemon)/15",
    border: "border-(--lemon)",
    text: "text-(--lemon)",
    badgeBg: "bg-(--lemon)",
    rowEven: "bg-(--lemon)/5",
    rowOdd: "bg-(--lemon)/15",
    accent: "--lemon",
  },
  digital: {
    bg: "bg-(--sky)",
    bgLight: "bg-(--sky)/15",
    border: "border-(--sky)",
    text: "text-(--sky)",
    badgeBg: "bg-(--sky)",
    rowEven: "bg-(--sky)/5",
    rowOdd: "bg-(--sky)/15",
    accent: "--sky",
  },
  deals: {
    bg: "bg-(--peach)",
    bgLight: "bg-(--peach)/15",
    border: "border-(--peach)",
    text: "text-(--peach)",
    badgeBg: "bg-(--peach)",
    rowEven: "bg-(--peach)/5",
    rowOdd: "bg-(--peach)/15",
    accent: "--peach",
  },
};

export const PRODUCT_CATEGORIES: {
  value: ProductCategory;
  label: string;
  color: string;
}[] = [
  { value: "fursuits", label: "Fursuits", color: "bg-(--pink)" },
  { value: "merch", label: "Merch", color: "bg-(--mint)" },
  { value: "art", label: "Art", color: "bg-(--lilac)" },
  { value: "events", label: "Events", color: "bg-(--lemon)" },
  { value: "digital", label: "Digital", color: "bg-(--sky)" },
  { value: "deals", label: "Deals", color: "bg-(--peach)" },
];

export function getCategoryTheme(category: ProductCategory): CategoryTheme {
  return CATEGORY_THEMES[category];
}
