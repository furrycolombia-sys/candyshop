// Re-exported from shared domain — single source of truth
export type {
  ProductCategory,
  ProductType,
} from "@/shared/domain/categoryTypes";

import type {
  ProductCategory,
  ProductType,
} from "@/shared/domain/categoryTypes";

export interface ProductImage {
  url: string;
  alt: string;
}

export interface MerchDetails {
  weight?: string;
  dimensions?: string;
  shipsFrom?: string;
  material?: string;
  careInstructions?: string;
}

export interface DigitalDetails {
  fileSize: string;
  format: string;
  resolution?: string;
  licenseType?: string;
}

export interface ServiceDetails {
  totalSlots: number;
  slotsAvailable: number;
  turnaroundDays: number;
  revisionsIncluded?: number;
  commercialUse?: boolean;
}

export interface TicketDetails {
  date: string;
  venue: string;
  location?: string;
  capacity: number;
  ticketsRemaining: number;
  doorsOpen?: string;
  ageRestriction?: string;
}

/** A single highlight/feature of the product */
export interface ProductHighlight {
  icon: string; // lucide icon name
  title: string;
  description: string;
}

/** A screenshot or gallery image with optional caption */
export interface ProductScreenshot {
  url: string;
  caption?: string;
}

/** A question and answer */
export interface ProductFaq {
  question: string;
  answer: string;
}

/** Seller/artist info */
export interface ProductSeller {
  name: string;
  avatar?: string;
  bio?: string;
  rating?: number;
  totalSales?: number;
  responseTime?: string;
}

/** A review/testimonial */
export interface ProductReview {
  author: string;
  avatar?: string;
  rating: number;
  text: string;
  date: string;
}

/** Specification row */
export interface ProductSpec {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Long-form rich description for the detail page */
  longDescription?: string;
  tagline?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  type: ProductType;
  category: ProductCategory;
  images: ProductImage[];
  screenshots?: ProductScreenshot[];
  inStock: boolean;
  featured: boolean;
  createdAt: string;
  /** Product tags for search */
  tags?: string[];
  /** Key highlights shown as feature cards */
  highlights?: ProductHighlight[];
  /** Specifications table */
  specs?: ProductSpec[];
  /** FAQ section */
  faq?: ProductFaq[];
  /** Seller/artist info */
  seller?: ProductSeller;
  /** Customer reviews */
  reviews?: ProductReview[];
  /** Average rating (1-5) */
  rating?: number;
  /** Total number of reviews */
  reviewCount?: number;
  // Type-specific details (only one populated based on type)
  merch?: MerchDetails;
  digital?: DigitalDetails;
  service?: ServiceDetails;
  ticket?: TicketDetails;
}
