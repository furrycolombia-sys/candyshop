import { NextRequest } from "next/server";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const currentUserMock = vi.fn();
const resolveProfileMock = vi.fn();
const createSupabaseProfileStoreMock = vi.fn(() => ({}));
const createServiceRoleSupabaseClientMock = vi.fn(() => ({}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: currentUserMock,
}));

vi.mock("api/supabase/server", () => ({
  createServiceRoleSupabaseClient: createServiceRoleSupabaseClientMock,
}));

vi.mock("auth/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("auth/server")>();
  return {
    ...actual,
    resolveProfile: resolveProfileMock,
    createSupabaseProfileStore: createSupabaseProfileStoreMock,
  };
});

// The allow-list of safe redirect origins is read from env at module load
// time, so it must be stubbed before the route module is imported.
let GET: typeof import("./route").GET;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_AUTH_URL = "http://localhost:5000";
  ({ GET } = await import("./route"));
});

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_2abc",
    primaryEmailAddress: {
      emailAddress: "buyer@example.com",
      verification: { status: "verified" },
    },
    fullName: "Buyer Example",
    username: null,
    imageUrl: "https://img.example.com/a.png",
    ...overrides,
  };
}

function callGet(url: string, locale = "en") {
  return GET(new NextRequest(url), { params: Promise.resolve({ locale }) });
}

describe("[locale]/callback GET", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["matched", "claimed", "created"] as const)(
    "redirects to the safe return URL when the profile is %s",
    async (status) => {
      currentUserMock.mockResolvedValue(makeUser());
      resolveProfileMock.mockResolvedValue({
        status,
        profile: {
          id: "p1",
          email: "buyer@example.com",
          identity_sub: "user_2abc",
        },
      });

      const response = await callGet(
        "http://localhost:5000/en/callback?next=%2Fen%2Faccount",
      );

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:5000/en/account",
      );
    },
  );

  it("falls back to the profile page when next targets a disallowed origin", async () => {
    currentUserMock.mockResolvedValue(makeUser());
    resolveProfileMock.mockResolvedValue({
      status: "matched",
      profile: {
        id: "p1",
        email: "buyer@example.com",
        identity_sub: "user_2abc",
      },
    });

    const response = await callGet(
      "http://localhost:5000/en/callback?next=https%3A%2F%2Fevil.example.com%2Fphish",
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:5000/en/profile",
    );
  });

  it("renders a contact-support error and logs the email on conflict, without redirecting", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    currentUserMock.mockResolvedValue(makeUser());
    resolveProfileMock.mockResolvedValue({
      status: "conflict",
      email: "taken@example.com",
    });

    const response = await callGet("http://localhost:5000/en/callback");

    expect(response.status).toBe(409);
    expect(response.headers.get("location")).toBeNull();
    const body = await response.text();
    expect(body.toLowerCase()).toContain("contact support");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("taken@example.com"),
    );

    errorSpy.mockRestore();
  });

  it("does not crash and renders an error when Clerk has no email for this identity", async () => {
    currentUserMock.mockResolvedValue(makeUser());
    resolveProfileMock.mockResolvedValue({ status: "email_required" });

    const response = await callGet("http://localhost:5000/en/callback");

    expect(response.status).toBe(400);
    expect(response.headers.get("location")).toBeNull();
    const body = await response.text();
    expect(body.length).toBeGreaterThan(0);
  });

  it("redirects to login when Clerk has no session for this request", async () => {
    currentUserMock.mockResolvedValue(null);

    const response = await callGet("http://localhost:5000/en/callback");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:5000/en/login",
    );
    expect(resolveProfileMock).not.toHaveBeenCalled();
  });

  it("renders a generic error instead of crashing when resolveProfile throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    currentUserMock.mockResolvedValue(makeUser());
    resolveProfileMock.mockRejectedValue(new Error("db unreachable"));

    const response = await callGet("http://localhost:5000/en/callback");

    expect(response.status).toBe(500);
    errorSpy.mockRestore();
  });
});
