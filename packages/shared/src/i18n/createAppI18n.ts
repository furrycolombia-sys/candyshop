import { createNavigation } from "next-intl/navigation";

import { createAppRouting } from "./createAppRouting";

export function createAppI18n() {
  const routing = createAppRouting();

  return {
    routing,
    ...createNavigation(routing),
  };
}
