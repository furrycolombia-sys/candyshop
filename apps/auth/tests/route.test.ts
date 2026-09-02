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
let GET: typeof import("@/app/[locale]/callback/route").GET;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_AUTH_URL = "http://localhost:5000";
  ({ GET } = await import("@/app/[locale]/callback/route"));
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

  it("falls back to the person's own profile page when next targets a disallowed origin", async () => {
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
    // NOT "/en/profile" — apps/auth has no route at that bare path (only
    // "/[locale]/profile/[id]"), so that used to 404 every ordinary sign-in.
    expect(response.headers.get("location")).toBe(
      "http://localhost:5000/en/profile/p1",
    );
  });

  it.each(["matched", "claimed", "created"] as const)(
    "with no `next` param at all, lands on the real per-id profile route for a %s profile — not the bare path that 404s",
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

      // No `?next=` at all — this is what an ordinary sign-in from the login
      // page's default button produces (SocialLoginButtons no longer guesses
      // a `next` value it can't back up with a real id).
      const response = await callGet("http://localhost:5000/en/callback");

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "http://localhost:5000/en/profile/p1",
      );
    },
  );

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

  it("maps a verified Clerk email onto ClerkIdentity.emailVerified: true", async () => {
    currentUserMock.mockResolvedValue(
      makeUser({
        primaryEmailAddress: {
          emailAddress: "buyer@example.com",
          verification: { status: "verified" },
        },
      }),
    );
    resolveProfileMock.mockResolvedValue({
      status: "matched",
      profile: {
        id: "p1",
        email: "buyer@example.com",
        identity_sub: "user_2abc",
      },
    });

    await callGet("http://localhost:5000/en/callback");

    expect(resolveProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "user_2abc",
        email: "buyer@example.com",
        emailVerified: true,
      }),
      expect.anything(),
    );
  });

  it("maps an UNVERIFIED Clerk email onto ClerkIdentity.emailVerified: false — this is the sole gate stopping an unverified address from claiming a restored profile", async () => {
    currentUserMock.mockResolvedValue(
      makeUser({
        primaryEmailAddress: {
          emailAddress: "buyer@example.com",
          verification: { status: "unverified" },
        },
      }),
    );
    resolveProfileMock.mockResolvedValue({
      status: "created",
      profile: {
        id: "p1",
        email: "buyer@example.com",
        identity_sub: "user_2abc",
      },
    });

    await callGet("http://localhost:5000/en/callback");

    expect(resolveProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "buyer@example.com",
        emailVerified: false,
      }),
      expect.anything(),
    );
  });

  it("maps a missing verification record onto ClerkIdentity.emailVerified: false (not truthy-by-default)", async () => {
    currentUserMock.mockResolvedValue(
      makeUser({
        primaryEmailAddress: {
          emailAddress: "buyer@example.com",
          verification: null,
        },
      }),
    );
    resolveProfileMock.mockResolvedValue({
      status: "created",
      profile: {
        id: "p1",
        email: "buyer@example.com",
        identity_sub: "user_2abc",
      },
    });

    await callGet("http://localhost:5000/en/callback");

    expect(resolveProfileMock).toHaveBeenCalledWith(
      expect.objectContaining({ emailVerified: false }),
      expect.anything(),
    );
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
