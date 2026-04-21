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

export async function fetchSellerReportOrders(
  filters: SellerReportFilters,
): Promise<SellerReportOrdersResponse> {
  const qs = toQueryString(filters);
  const url = qs
    ? `/api/seller/reports/orders?${qs}`
    : "/api/seller/reports/orders";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch seller report orders");
  }
  return response.json() as Promise<SellerReportOrdersResponse>;
}
