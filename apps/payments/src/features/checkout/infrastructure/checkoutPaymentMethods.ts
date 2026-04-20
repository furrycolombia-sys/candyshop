import type {
  CartItem,
  CheckoutPaymentMethodsResponse,
} from "@/features/checkout/domain/types";

interface FetchCheckoutPaymentMethodsParams {
  sellerId: string;
  items: CartItem[];
}

/**
 * Load checkout payment methods through a server-side validation boundary.
 * The backend must return no payment details when stock validation fails.
 */
export async function fetchCheckoutPaymentMethods({
  sellerId,
  items,
}: FetchCheckoutPaymentMethodsParams): Promise<CheckoutPaymentMethodsResponse> {
  // In standalone/production mode the app is served under /payments basePath.
  // fetch() doesn't auto-prepend basePath, so we derive it from the current URL.
  const basePath =
    globalThis.window !== undefined &&
    globalThis.window.location.pathname.startsWith("/payments")
      ? "/payments"
      : "";

  const response = await fetch(`${basePath}/api/checkout/payment-methods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sellerId,
      items: items.map((item) => ({
        id: item.id,
        quantity: item.rawQuantity ?? item.quantity,
      })),
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to load payment methods");
  }

  const data =
    (await response.json()) as Partial<CheckoutPaymentMethodsResponse>;

  return {
    methods: Array.isArray(data.methods) ? data.methods : [],
    hasStockIssues: data.hasStockIssues === true,
  };
}
