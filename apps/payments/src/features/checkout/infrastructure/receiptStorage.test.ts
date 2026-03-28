import { describe, it, expect, vi, beforeEach } from "vitest";

import { deleteReceipt, uploadReceipt } from "./receiptStorage";

const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
}));

const mockSupabase = {
  storage: { from: mockStorageFrom },
} as unknown as Parameters<typeof uploadReceipt>[0];

describe("uploadReceipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploads file to the receipts bucket and returns storage path", async () => {
    mockUpload.mockResolvedValue({ error: null });

    const file = new File(["data"], "receipt.png", { type: "image/png" });
    const result = await uploadReceipt(mockSupabase, file, "order-123");

    expect(mockStorageFrom).toHaveBeenCalledWith("receipts");
    expect(mockUpload).toHaveBeenCalledWith("order-123/receipt.png", file, {
      upsert: true,
    });
    expect(result).toBe("order-123/receipt.png");
  });

  it("throws on upload error", async () => {
    const uploadError = new Error("Upload failed");
    mockUpload.mockResolvedValue({ error: uploadError });

    const file = new File(["data"], "receipt.png", { type: "image/png" });

    await expect(
      uploadReceipt(mockSupabase, file, "order-123"),
    ).rejects.toThrow("Upload failed");
  });
});

describe("deleteReceipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes the file from the receipts bucket", async () => {
    mockRemove.mockResolvedValue({ error: null });

    await deleteReceipt(mockSupabase, "order-123/receipt.png");

    expect(mockStorageFrom).toHaveBeenCalledWith("receipts");
    expect(mockRemove).toHaveBeenCalledWith(["order-123/receipt.png"]);
  });

  it("throws on remove error", async () => {
    const removeError = new Error("Remove failed");
    mockRemove.mockResolvedValue({ error: removeError });

    await expect(
      deleteReceipt(mockSupabase, "order-123/receipt.png"),
    ).rejects.toThrow("Remove failed");
  });
});
