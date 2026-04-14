/* eslint-disable testing-library/no-node-access */
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { DiscordIcon } from "./DiscordIcon";
import { GoogleIcon } from "./GoogleIcon";

describe("Social Icons", () => {
  it("DiscordIcon renders an SVG", () => {
    const { container } = render(<DiscordIcon />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("GoogleIcon renders an SVG", () => {
    const { container } = render(<GoogleIcon />);
    expect(container.querySelector("svg")).toBeTruthy();
  });
});
