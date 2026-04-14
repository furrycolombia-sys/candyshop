import { describe, it, expect, vi } from "vitest";

import { fetchActiveTemplates } from "./templateQueries";

describe("fetchActiveTemplates", () => {
  it("returns active templates", async () => {
    const mockData = [{ id: "t1", name_en: "Basic", sections: [] }];
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ data: mockData, error: null }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await fetchActiveTemplates(supabase);
    expect(result).toEqual(mockData);
    expect(supabase.from).toHaveBeenCalledWith("product_templates");
  });

  it("throws on error", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: null,
              error: new Error("fail"),
            }),
          }),
        }),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    await expect(fetchActiveTemplates(supabase)).rejects.toThrow("fail");
  });
});
