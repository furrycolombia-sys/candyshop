import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("api/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

const BUYER_ID = "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13";
const SELLER_ID = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12";
const PRODUCT_ID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const METHOD_ID = "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14";
const ORDER_ID = "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/checkout/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function loadRoute(signedIn = true) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role";
  vi.resetModules();

  const routeModule = await import("@/app/api/checkout/orders/route");
  const supabaseModule = await import("api/supabase/server");

  vi.mocked(supabaseModule.createServerSupabaseClient).mockResolvedValue({
    rpc: vi
      .fn()
      .mockResolvedValue({ data: signedIn ? BUYER_ID : null, error: null }),
  } as unknown as Awaited<
    ReturnType<typeof supabaseModule.createServerSupabaseClient>
  >);

  return routeModule.POST;
}

/** The payment-method lookup, then the product lookup. */
function mockLookups(maxQuantity: number) {
  vi.mocked(fetch)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ seller_id: SELLER_ID, form_fields: [] }],
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: PRODUCT_ID,
          price: 1000,
          currency: "COP",
          max_quantity: maxQuantity,
          is_active: true,
          seller_id: SELLER_ID,
        },
      ],
    } as Response);
}

/** The order insert, then the order-items insert. */
function mockWrites() {
  vi.mocked(fetch)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: ORDER_ID }],
    } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response);
}

describe("POST /api/checkout/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("creates the order when the cart is within stock", async () => {
    const POST = await loadRoute();
    mockLookups(8);
    mockWrites();

    const response = await POST(
      makeRequest({
        payment_method_id: METHOD_ID,
        buyer_submission: {},
        items: [{ id: PRODUCT_ID, quantity: 8 }],
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ orderId: ORDER_ID });
  });

  it("rejects a single line that exceeds stock", async () => {
    const POST = await loadRoute();
    mockLookups(8);

    const response = await POST(
      makeRequest({
        payment_method_id: METHOD_ID,
        buyer_submission: {},
        items: [{ id: PRODUCT_ID, quantity: 9 }],
      }),
    );

    expect(response.status).toBe(422);
  });

  // The bypass: /api/checkout/payment-methods sums duplicate ids before
  // comparing against max_quantity, so it reports a stock issue and withholds
  // the seller's payment details. This route validated each line separately,
  // so two lines of 5 against a stock of 8 both passed and an order for 10
  // units was written. The endpoint that WRITES was the permissive one.
  it("rejects duplicate lines for one product that together exceed stock", async () => {
    const POST = await loadRoute();
    mockLookups(8);

    const response = await POST(
      makeRequest({
        payment_method_id: METHOD_ID,
        buyer_submission: {},
        items: [
          { id: PRODUCT_ID, quantity: 5 },
          { id: PRODUCT_ID, quantity: 5 },
        ],
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("8"),
    });
  });

  it("merges duplicate lines for one product that stay within stock", async () => {
    const POST = await loadRoute();
    mockLookups(8);
    mockWrites();

    const response = await POST(
      makeRequest({
        payment_method_id: METHOD_ID,
        buyer_submission: {},
        items: [
          { id: PRODUCT_ID, quantity: 3 },
          { id: PRODUCT_ID, quantity: 4 },
        ],
      }),
    );

    expect(response.status).toBe(201);

    // One order_items row for the product, quantity 7 -- not two rows.
    const itemsCall = vi.mocked(fetch).mock.calls.at(-1);
    const body = JSON.parse(String((itemsCall?.[1] as RequestInit).body));
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ product_id: PRODUCT_ID, quantity: 7 });
  });

  it("rejects a product belonging to another seller", async () => {
    const POST = await loadRoute();
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ seller_id: SELLER_ID, form_fields: [] }],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: PRODUCT_ID,
            price: 1000,
            currency: "COP",
            max_quantity: 8,
            is_active: true,
            seller_id: "f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16",
          },
        ],
      } as Response);

    const response = await POST(
      makeRequest({
        payment_method_id: METHOD_ID,
        buyer_submission: {},
        items: [{ id: PRODUCT_ID, quantity: 1 }],
      }),
    );

    expect(response.status).toBe(422);
  });

  it("rejects requests with no signed-in session", async () => {
    const POST = await loadRoute(false);

    const response = await POST(
      makeRequest({
        payment_method_id: METHOD_ID,
        buyer_submission: {},
        items: [{ id: PRODUCT_ID, quantity: 1 }],
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects invalid payloads", async () => {
    const POST = await loadRoute();

    const response = await POST(
      makeRequest({
        payment_method_id: METHOD_ID,
        buyer_submission: {},
        items: [{ id: PRODUCT_ID, quantity: 0 }],
      }),
    );

    expect(response.status).toBe(400);
  });
});
