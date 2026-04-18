// Shared utility functions

export { tid, TID_ATTR } from "./tid";
export { getSharedCookieDomain } from "./cookieDomain";
export type { TidOptionProps } from "./tid";

export { stripTrailingSlash } from "./url";
export { i18nField } from "./i18nField";
export { i18nPrice, i18nCurrencyCode } from "./i18nPrice";
export { formatCop, COP_CURRENCY_CODE } from "./formatCop";
export { slugify } from "./slugify";
export { typeDetails } from "./typeDetails";
export { escapeLikePattern } from "./escapeLikePattern";
export {
  CATEGORY_THEMES,
  PRODUCT_CATEGORIES,
  getCategoryColor,
  getCategoryTheme,
} from "./categoryConstants";
export type { CategoryTheme } from "./categoryConstants";
export type {
  MerchDetails,
  DigitalDetails,
  ServiceDetails,
  TicketDetails,
} from "./typeDetails";
export { getCoverImageUrl } from "./getCoverImageUrl";
