// Shared utility functions

export { tid, TID_ATTR } from "./tid";
export { getSharedCookieDomain } from "./cookieDomain";
export type { TidOptionProps } from "./tid";

export { stripTrailingSlash } from "./url";
export { i18nField } from "./i18nField";
export { i18nPrice, i18nCurrencyCode } from "./i18nPrice";
export { slugify } from "./slugify";
export { typeDetails } from "./typeDetails";
export type {
  MerchDetails,
  DigitalDetails,
  ServiceDetails,
  TicketDetails,
} from "./typeDetails";
export { getCoverImageUrl } from "./getCoverImageUrl";
export { escapeLikePattern } from "./escapeLikePattern";
export { formatCop, COP_CURRENCY_CODE } from "./formatCop";
export type { CategoryTheme } from "./categoryConstants";
export {
  CATEGORY_THEMES,
  PRODUCT_CATEGORIES,
  getCategoryTheme,
  getCategoryColor,
} from "./categoryConstants";
