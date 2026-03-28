import { describe, it, expect } from "vitest";

import { TEMPLATES_QUERY_KEY, TEMPLATE_FORM_DEFAULTS } from "./constants";

describe("templates domain constants", () => {
  it("exports TEMPLATES_QUERY_KEY", () => {
    expect(TEMPLATES_QUERY_KEY).toBe("product-templates");
  });

  it("exports TEMPLATE_FORM_DEFAULTS with correct shape", () => {
    expect(TEMPLATE_FORM_DEFAULTS).toEqual({
      name_en: "",
      name_es: "",
      description_en: "",
      description_es: "",
      sections: [],
      sort_order: 0,
      is_active: true,
    });
  });

  it("TEMPLATE_FORM_DEFAULTS has empty sections array", () => {
    expect(TEMPLATE_FORM_DEFAULTS.sections).toHaveLength(0);
  });

  it("TEMPLATE_FORM_DEFAULTS is_active defaults to true", () => {
    expect(TEMPLATE_FORM_DEFAULTS.is_active).toBe(true);
  });
});
