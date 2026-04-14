import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
}));

vi.mock("shared", () => ({
  tid: (id: string) => ({ "data-testid": id }),
}));

vi.mock("ui", () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, ...props }: any) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

import { EditDelegatePermissions } from "./EditDelegatePermissions";

import type { DelegateWithProfile } from "@/features/seller-admins/domain/types";

const mockDelegate: DelegateWithProfile = {
  id: "del-1",
  seller_id: "seller-1",
  admin_user_id: "admin-1",
  product_id: "product-1",
  permissions: ["orders.approve"],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  admin_profile: {
    id: "admin-1",
    email: "delegate@example.com",
    display_name: "Delegate User",
    avatar_url: null,
  },
};

describe("EditDelegatePermissions", () => {
  it("renders with current permissions checked", () => {
    render(
      <EditDelegatePermissions
        delegate={mockDelegate}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const approveCheckbox = screen.getByTestId(
      "delegate-edit-permission-orders.approve",
    ) as HTMLInputElement;
    const proofCheckbox = screen.getByTestId(
      "delegate-edit-permission-orders.request_proof",
    ) as HTMLInputElement;
    expect(approveCheckbox.checked).toBe(true);
    expect(proofCheckbox.checked).toBe(false);
  });

  it("calls onSave with updated permissions", () => {
    const onSave = vi.fn();
    render(
      <EditDelegatePermissions
        delegate={mockDelegate}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );
    const proofCheckbox = screen.getByTestId(
      "delegate-edit-permission-orders.request_proof",
    );
    fireEvent.click(proofCheckbox);

    const saveBtn = screen.getByText("savePermissions");
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledWith(
      "admin-1",
      expect.arrayContaining(["orders.approve", "orders.request_proof"]),
    );
  });

  it("calls onCancel when cancel is clicked", () => {
    const onCancel = vi.fn();
    render(
      <EditDelegatePermissions
        delegate={mockDelegate}
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByText("cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("unchecks a permission and saves with remaining permissions", () => {
    const delegateWithBoth: DelegateWithProfile = {
      ...mockDelegate,
      permissions: ["orders.approve", "orders.request_proof"],
    };
    const onSave = vi.fn();
    render(
      <EditDelegatePermissions
        delegate={delegateWithBoth}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const approveCheckbox = screen.getByTestId(
      "delegate-edit-permission-orders.approve",
    ) as HTMLInputElement;
    expect(approveCheckbox.checked).toBe(true);

    fireEvent.click(approveCheckbox);
    expect(approveCheckbox.checked).toBe(false);

    fireEvent.click(screen.getByText("savePermissions"));
    expect(onSave).toHaveBeenCalledWith("admin-1", ["orders.request_proof"]);
  });

  it("does not save when all permissions are unchecked", () => {
    const onSave = vi.fn();
    render(
      <EditDelegatePermissions
        delegate={mockDelegate}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    const approveCheckbox = screen.getByTestId(
      "delegate-edit-permission-orders.approve",
    );
    fireEvent.click(approveCheckbox);

    fireEvent.click(screen.getByText("savePermissions"));
    expect(onSave).not.toHaveBeenCalled();
  });
});
