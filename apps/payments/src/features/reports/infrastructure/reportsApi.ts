import type {
  SellerReportFilters,
  SellerReportOrdersResponse,
} from "@/features/reports/domain/types";

function toQueryString(filters: SellerReportFilters): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  if (filters.buyerId) params.set("buyerId", filters.buyerId);
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.amountMin != null)
    params.set("amountMin", String(filters.amountMin));
  if (filters.amountMax != null)
    params.set("amountMax", String(filters.amountMax));
  return params.toString();
}

// In standalone/production mode the app is served under /payments basePath.
// fetch() doesn't auto-prepend basePath, so we derive it from the current URL.
function getBasePath(): string {
  return globalThis.window !== undefined &&
    globalThis.window.location.pathname.startsWith("/payments")
    ? "/payments"
    : "";
}

export async function fetchSellerReportOrders(
  filters: SellerReportFilters,
): Promise<SellerReportOrdersResponse> {
  const basePath = getBasePath();
  const qs = toQueryString(filters);
  const url = qs
    ? `${basePath}/api/seller/reports/orders?${qs}`
    : `${basePath}/api/seller/reports/orders`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch seller report orders");
  }
  return response.json() as Promise<SellerReportOrdersResponse>;
}
