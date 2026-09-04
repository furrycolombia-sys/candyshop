export { CheckoutPage } from "./presentation/pages/CheckoutPage";

// Exported for the API route that consumes it. A route is outside the
// feature, so what it needs is part of the feature's public API by
// definition -- reaching past the barrel for it is the thing the
// architecture rule asks routes not to do.
export type {
  CheckoutPaymentMethodsResponse,
  SellerPaymentMethodWithType,
} from "./domain/types";
