import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("api/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/checkout/payment-methods", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function loadRouteModule() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  vi.resetModules();

  const routeModule = await import("./route");
  const supabaseModule = await import("api/supabase/server");

  vi.mocked(supabaseModule.createServerSupabaseClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "buyer-1",
          },
        },
      }),
    },
  } as unknown as Awaited<
    ReturnType<typeof supabaseModule.createServerSupabaseClient>
  >);

  return {
    POST: routeModule.POST,
  };
}

describe("POST /api/checkout/payment-methods", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns payment methods when the cart quantities are valid", async () => {
    const { POST } = await loadRouteModule();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            expires_at: null,
            resource_permissions: {
              permissions: {
                key: "orders.create",
              },
            },
          },
          {
            expires_at: null,
            resource_permissions: {
              permissions: {
                key: "receipts.create",
              },
            },
          },
        ],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "product-1",
            seller_id: "seller-1",
            is_active: true,
            max_quantity: 3,
          },
        ],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "pm-1",
            account_details_en: "Account 123",
            account_details_es: "Cuenta 123",
            seller_note_en: "Bring receipt",
            seller_note_es: "Traer recibo",
            payment_method_types: {
              name_en: "Bank Transfer",
              name_es: "Transferencia",
              icon: "bank",
              requires_receipt: true,
              requires_transfer_number: true,
              required_buyer_fields: [],
            },
          },
        ],
      } as Response);

    const response = await POST(
      makeRequest({
        sellerId: "seller-1",
        items: [{ id: "product-1", quantity: 2 }],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      hasStockIssues: false,
      methods: [
        {
          id: "pm-1",
          type_name_en: "Bank Transfer",
          type_name_es: "Transferencia",
          type_icon: "bank",
          requires_receipt: true,
          requires_transfer_number: true,
          required_buyer_fields: [],
          account_details_en: "Account 123",
          account_details_es: "Cuenta 123",
          seller_note_en: "Bring receipt",
          seller_note_es: "Traer recibo",
        },
      ],
    });
  });

  it("returns no payment methods when the cart exceeds stock", async () => {
    const { POST } = await loadRouteModule();

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            expires_at: null,
            resource_permissions: {
              permissions: {
                key: "orders.create",
              },
            },
          },
          {
            expires_at: null,
            resource_permissions: {
              permissions: {
                key: "receipts.create",
              },
            },
          },
        ],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "product-1",
            seller_id: "seller-1",
            is_active: true,
            max_quantity: 1,
          },
        ],
      } as Response);

    const response = await POST(
      makeRequest({
        sellerId: "seller-1",
        items: [{ id: "product-1", quantity: 2 }],
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      hasStockIssues: true,
      methods: [],
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects users without checkout permissions", async () => {
    const { POST } = await loadRouteModule();

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          expires_at: null,
          resource_permissions: {
            permissions: {
              key: "orders.create",
            },
          },
        },
      ],
    } as Response);

    const response = await POST(
      makeRequest({
        sellerId: "seller-1",
        items: [{ id: "product-1", quantity: 1 }],
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects invalid payloads", async () => {
    const { POST } = await loadRouteModule();

    const response = await POST(
      makeRequest({
        sellerId: "seller-1",
        items: [{ id: "product-1", quantity: 0 }],
      }),
    );

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
