import type {
  ReportFilters,
  ReportOrdersResponse,
} from "@/features/reports/domain/types";

function toQueryString(filters: ReportFilters): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.status) params.set("status", filters.status);
  if (filters.sellerId) params.set("sellerId", filters.sellerId);
  if (filters.buyerId) params.set("buyerId", filters.buyerId);
  if (filters.productId) params.set("productId", filters.productId);
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.amountMin != null)
    params.set("amountMin", String(filters.amountMin));
  if (filters.amountMax != null)
    params.set("amountMax", String(filters.amountMax));
  return params.toString();
}

export async function fetchReportOrders(
  filters: ReportFilters,
): Promise<ReportOrdersResponse> {
  const qs = toQueryString(filters);
  const url = qs
    ? `/api/admin/reports/orders?${qs}`
    : "/api/admin/reports/orders";
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch report orders");
  }
  return response.json() as Promise<ReportOrdersResponse>;
}
