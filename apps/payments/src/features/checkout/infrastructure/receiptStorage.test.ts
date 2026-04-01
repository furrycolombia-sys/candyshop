import { describe, it, expect, vi, beforeEach } from "vitest";

import { deleteReceipt, getReceiptUrl, uploadReceipt } from "./receiptStorage";

const mockUpload = vi.fn();
const mockRemove = vi.fn();
const mockCreateSignedUrl = vi.fn();
const mockStorageFrom = vi.fn(() => ({
  upload: mockUpload,
  remove: mockRemove,
  createSignedUrl: mockCreateSignedUrl,
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

  it("sanitizes receipt file names before upload", async () => {
    mockUpload.mockResolvedValue({ error: null });

    const file = new File(["data"], "../../Receipt Final.jpeg", {
      type: "image/jpeg",
    });
    const result = await uploadReceipt(mockSupabase, file, "order-123");

    expect(mockUpload).toHaveBeenCalledWith(
      "order-123/receipt-final.jpg",
      file,
      { upsert: true },
    );
    expect(result).toBe("order-123/receipt-final.jpg");
  });

  it("throws on upload error", async () => {
    const uploadError = new Error("Upload failed");
    mockUpload.mockResolvedValue({ error: uploadError });

    const file = new File(["data"], "receipt.png", { type: "image/png" });

    await expect(
      uploadReceipt(mockSupabase, file, "order-123"),
    ).rejects.toThrow("Upload failed");
  });

  it("throws when the receipt type is not allowed", async () => {
    const file = new File(["data"], "receipt.gif", { type: "image/gif" });

    await expect(
      uploadReceipt(mockSupabase, file, "order-123"),
    ).rejects.toThrow("invalid_receipt_type");
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

describe("getReceiptUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no storage path is provided", async () => {
    await expect(getReceiptUrl(mockSupabase, null)).resolves.toBeNull();
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it("returns a signed url for valid storage paths", async () => {
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://example.com/signed.png" },
      error: null,
    });

    await expect(
      getReceiptUrl(mockSupabase, "order-123/receipt.png"),
    ).resolves.toBe("https://example.com/signed.png");
  });
});
