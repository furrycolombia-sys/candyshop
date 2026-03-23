"use client";

import { CartDrawer } from "./CartDrawer";

/**
 * Nav-area cart entry point. Renders a CartDrawer which owns its Sheet trigger
 * showing the icon + item count badge. This wrapper lets the nav import a
 * single named "CartButton" without knowing the CartDrawer internals.
 */
export function CartButton() {
  return <CartDrawer />;
}
