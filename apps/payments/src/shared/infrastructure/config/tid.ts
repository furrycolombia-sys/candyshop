import { environment } from "@/shared/infrastructure/config/environment";

interface TidOptionProps {
  id?: string;
  cls?: string | Array<string>;
  vals?: Record<string, string>;
}

interface HTMLTagAttributeProps {
  [key: string]: string;
}

export const TID_ATTR = "data-testid";

/**
 * Produces a destructurable object of data attributes for test selectors.
 * Returns an empty object in production.
 */
export const tid = (
  idOrOptions: string | TidOptionProps,
): HTMLTagAttributeProps => {
  if (
    environment.isProduction &&
    process.env.NEXT_PUBLIC_ENABLE_TEST_IDS !== "true"
  )
    return {};

  if (typeof idOrOptions === "string") {
    return { [TID_ATTR]: idOrOptions };
  }

  const options = idOrOptions;

  return {
    ...(options?.id ? { [TID_ATTR]: options.id } : {}),
    ...(options?.cls
      ? { "data-test-class": [options.cls].flat().join(" ") }
      : {}),
    ...(options?.vals
      ? Object.fromEntries(
          Object.entries(options.vals).map(([key, value]) => [
            `data-test-${key}`,
            value,
          ]),
        )
      : {}),
  };
};
