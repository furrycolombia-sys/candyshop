import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockHasPermission = vi.fn(() => true);

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("auth/client", () => ({
  useCurrentUserPermissions: () => ({
    isLoading: false,
    hasPermission: mockHasPermission,
  }),
}));

vi.mock("@/shared/application/hooks/useSupabaseAuth", () => ({
  useSupabaseAuth: () => ({ user: { id: "seller-1" } }),
}));

vi.mock("@/features/seller-admins/application/hooks/useDelegates", () => ({
  useDelegates: () => ({ data: [], isLoading: false }),
}));

vi.mock(
  "@/features/seller-admins/application/hooks/useDelegateMutations",
  () => ({
    useAddDelegate: () => ({ mutate: vi.fn(), isPending: false }),
    useRemoveDelegate: () => ({ mutate: vi.fn(), isPending: false }),
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/DelegateList",
  () => ({
    DelegateList: () => <div data-testid="delegate-list" />,
  }),
);

vi.mock(
  "@/features/seller-admins/presentation/components/AddDelegateForm",
  () => ({
    AddDelegateForm: () => <div data-testid="add-delegate-form" />,
  }),
);

import { DelegateManagementPage } from "./DelegateManagementPage";

describe("DelegateManagementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasPermission.mockReturnValue(true);
  });

  it("renders the page with title", () => {
    render(<DelegateManagementPage />);
    expect(screen.getByTestId("delegate-management-page")).toBeInTheDocument();
    expect(screen.getByText("title")).toBeInTheDocument();
  });

  it("renders delegate list and add form", () => {
    render(<DelegateManagementPage />);
    expect(screen.getByTestId("delegate-list")).toBeInTheDocument();
    expect(screen.getByTestId("add-delegate-form")).toBeInTheDocument();
  });

  it("shows access denied when missing permission", () => {
    mockHasPermission.mockReturnValue(false);
    render(<DelegateManagementPage />);
    expect(
      screen.queryByTestId("delegate-management-page"),
    ).not.toBeInTheDocument();
  });
});
