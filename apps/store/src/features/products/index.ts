export type {
  ServiceDetails,
  DigitalDetails,
  MerchDetails,
  Product,
  ProductCategory,
  ProductImage,
  ProductType,
  TicketDetails,
} from "./domain";

export { PRODUCT_CATEGORIES, PRODUCT_TYPES } from "./domain";

// Presentation
export { ProductCard } from "./presentation/components/ProductCard";
export { CategoryFilter } from "./presentation/components/CategoryFilter";
export { TypeFilter } from "./presentation/components/TypeFilter";
export { SearchBar } from "./presentation/components/SearchBar";
export { ProductGrid } from "./presentation/components/ProductGrid";
export { ProductCatalogPage } from "./presentation/pages/ProductCatalogPage";
export { ProductDetailPage } from "./presentation/pages/ProductDetailPage";
