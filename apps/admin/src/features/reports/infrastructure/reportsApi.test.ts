import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/shared/application/utils/getApiBasePath", () => ({
  getApiBasePath: () => "",
}));

import { fetchReportOrders } from "./reportsApi";

import type { ReportFilters } from "@/features/reports/domain/types";

const emptyFilters: ReportFilters = {
  dateFrom: null,
  dateTo: null,
  status: null,
  sellerId: null,
  buyerId: null,
  productId: null,
  currency: null,
  amountMin: null,
  amountMax: null,
};

const mockResponse = { orders: [], total: 0 };

function makeFetchMock(
  ok: boolean,
  body: unknown = mockResponse,
  status = 200,
) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("fetchReportOrders", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("calls the correct base URL when no filters are set", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders(emptyFilters);

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/reports/orders");
  });

  it("appends dateFrom and dateTo to query string", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({
      ...emptyFilters,
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("dateFrom=2024-01-01");
    expect(calledUrl).toContain("dateTo=2024-01-31");
  });

  it("appends status filter", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({ ...emptyFilters, status: "approved" });

    expect(fetchMock.mock.calls[0][0]).toContain("status=approved");
  });

  it("appends sellerId filter", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({ ...emptyFilters, sellerId: "seller-1" });

    expect(fetchMock.mock.calls[0][0]).toContain("sellerId=seller-1");
  });

  it("appends buyerId filter", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({ ...emptyFilters, buyerId: "buyer-1" });

    expect(fetchMock.mock.calls[0][0]).toContain("buyerId=buyer-1");
  });

  it("appends productId filter", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({ ...emptyFilters, productId: "prod-1" });

    expect(fetchMock.mock.calls[0][0]).toContain("productId=prod-1");
  });

  it("appends currency filter", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({ ...emptyFilters, currency: "USD" });

    expect(fetchMock.mock.calls[0][0]).toContain("currency=USD");
  });

  it("appends amountMin filter including zero", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({ ...emptyFilters, amountMin: 0 });

    expect(fetchMock.mock.calls[0][0]).toContain("amountMin=0");
  });

  it("appends amountMax filter", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({ ...emptyFilters, amountMax: 500 });

    expect(fetchMock.mock.calls[0][0]).toContain("amountMax=500");
  });

  it("omits null filters from query string", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders(emptyFilters);

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("?");
  });

  it("returns parsed JSON on success", async () => {
    const body = { orders: [{ id: "o1" }], total: 1 };
    globalThis.fetch = makeFetchMock(true, body);

    const result = await fetchReportOrders(emptyFilters);

    expect(result).toEqual(body);
  });

  it("throws when response is not ok", async () => {
    globalThis.fetch = makeFetchMock(false, { error: "bad" }, 500);

    await expect(fetchReportOrders(emptyFilters)).rejects.toThrow(
      "Failed to fetch report orders",
    );
  });

  it("builds URL with ? separator when query string is non-empty", async () => {
    const fetchMock = makeFetchMock(true);
    globalThis.fetch = fetchMock;

    await fetchReportOrders({ ...emptyFilters, status: "pending" });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("?");
    expect(calledUrl).toMatch(/\/api\/admin\/reports\/orders\?/);
  });
});
