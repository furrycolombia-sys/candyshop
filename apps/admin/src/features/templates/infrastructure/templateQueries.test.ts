import { describe, it, expect, vi } from "vitest";

import {
  fetchTemplates,
  fetchActiveTemplates,
  insertTemplate,
  updateTemplate,
  deleteTemplate,
  toggleTemplateActive,
} from "./templateQueries";

import type { TemplateFormValues } from "@/features/templates/domain/types";

function createChainableMock(
  resolvedData: unknown,
  resolvedError: unknown = null,
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const result = { data: resolvedData, error: resolvedError };

  chain.select = vi.fn().mockReturnValue({
    order: vi.fn().mockResolvedValue(result),
    eq: vi.fn().mockReturnValue({
      order: vi.fn().mockResolvedValue(result),
    }),
    single: vi.fn().mockResolvedValue(result),
  });
  chain.insert = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue(result),
    }),
  });
  chain.update = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
  chain.delete = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue(result),
  });
  chain.eq = vi.fn().mockResolvedValue(result);

  return {
    from: vi.fn().mockReturnValue(chain),
  } as unknown as ReturnType<
    typeof import("api/supabase").createBrowserSupabaseClient
  >;
}

describe("fetchTemplates", () => {
  it("returns data on success", async () => {
    const mockData = [{ id: "1", name_en: "Template 1" }];
    const supabase = createChainableMock(mockData);

    const result = await fetchTemplates(supabase);
    expect(result).toEqual(mockData);
    expect(supabase.from).toHaveBeenCalled();
  });

  it("throws on error", async () => {
    const supabase = createChainableMock(null, { message: "DB error" });
    await expect(fetchTemplates(supabase)).rejects.toEqual({
      message: "DB error",
    });
  });
});

describe("fetchActiveTemplates", () => {
  it("returns data on success", async () => {
    const mockData = [{ id: "1", is_active: true }];
    const supabase = createChainableMock(mockData);

    const result = await fetchActiveTemplates(supabase);
    expect(result).toEqual(mockData);
  });
});

describe("insertTemplate", () => {
  it("returns created template on success", async () => {
    const newTemplate = { id: "new-1", name_en: "New" };
    const supabase = createChainableMock(newTemplate);

    const values: TemplateFormValues = {
      name_en: "New",
      name_es: "Nuevo",
      description_en: "",
      description_es: "",
      sections: [],
      sort_order: 0,
      is_active: true,
    };

    const result = await insertTemplate(supabase, values);
    expect(result).toEqual(newTemplate);
  });
});

describe("updateTemplate", () => {
  it("returns updated template on success", async () => {
    const updated = { id: "1", name_en: "Updated" };
    const supabase = createChainableMock(updated);

    const result = await updateTemplate(supabase, "1", { name_en: "Updated" });
    expect(result).toEqual(updated);
  });
});

describe("deleteTemplate", () => {
  it("resolves on success", async () => {
    const supabase = createChainableMock(null);
    await expect(deleteTemplate(supabase, "1")).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const supabase = createChainableMock(null, { message: "Not found" });
    await expect(deleteTemplate(supabase, "1")).rejects.toEqual({
      message: "Not found",
    });
  });
});

describe("toggleTemplateActive", () => {
  it("resolves on success", async () => {
    const supabase = createChainableMock(null);
    await expect(
      toggleTemplateActive(supabase, "1", true),
    ).resolves.toBeUndefined();
  });
});
