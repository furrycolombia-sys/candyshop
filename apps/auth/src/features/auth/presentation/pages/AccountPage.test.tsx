import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/features/account", () => ({
  AccountSettingsPage: () => <div data-testid="account-settings">Settings</div>,
}));

import { AccountPage } from "./AccountPage";

describe("AccountPage", () => {
  it("renders AccountSettingsPage", () => {
    const { getByTestId } = render(<AccountPage />);
    expect(getByTestId("account-settings")).toBeInTheDocument();
  });
});
