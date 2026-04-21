import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { ELEMENT_TIMEOUT_MS } from "../../auth/e2e/helpers/constants";
import {
  ADMIN_PERMISSIONS,
  adminDelete,
  adminInsert,
  createTestUser,
  injectSession,
  supabaseAdmin,
  type TestUser,
} from "../../auth/e2e/helpers/session";

type DownloadChunk = Uint8Array;

function asBuffer(chunks: DownloadChunk[]): Uint8Array {
  const totalSize = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const merged = new Uint8Array(totalSize);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

test.describe.serial("users export includes receipt file backups", () => {
  let adminUser: TestUser;
  let buyerUser: TestUser;
  let orderId: string;
  let storagePath: string;
  const receiptPayload = `critical-receipt-backup-${Date.now()}`;
  const expectedReceiptBase64 = Buffer.from(receiptPayload, "utf-8").toString(
    "base64",
  );

  test.beforeAll(async () => {
    adminUser = await createTestUser("admin-export", [
      ...ADMIN_PERMISSIONS,
      "users.export",
    ]);
    buyerUser = await createTestUser("buyer-export");

    orderId = randomUUID();
    storagePath = `${orderId}/receipt-e2e.png`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for e2e upload setup.",
      );
    }

    await adminInsert("orders", {
      id: orderId,
      user_id: buyerUser.userId,
      seller_id: adminUser.userId,
      total: 12345,
      currency: "COP",
      payment_status: "pending_verification",
      receipt_url: null,
      transfer_number: "E2E-TRANSFER-001",
    });

    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/receipts/${storagePath}`,
      {
        method: "POST",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "image/png",
          "x-upsert": "true",
        },
        body: receiptPayload,
      },
    );

    if (!uploadResponse.ok) {
      const body = await uploadResponse.text();
      throw new Error(
        `Failed to upload e2e receipt file: ${uploadResponse.status} ${body}`,
      );
    }

    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receipt_url: storagePath }),
      },
    );

    if (!updateResponse.ok) {
      const body = await updateResponse.text();
      throw new Error(`Failed to update order receipt_url: ${body}`);
    }
  });

  test.afterAll(async () => {
    await adminDelete("orders", `id=eq.${orderId}`).catch(() => {});
    await supabaseAdmin.storage.from("receipts").remove([storagePath]);
    await supabaseAdmin.auth.admin.deleteUser(adminUser.userId);
    await supabaseAdmin.auth.admin.deleteUser(buyerUser.userId);
  });

  test("downloads export with receipt worksheet and base64 payload", async ({
    context,
    page,
  }) => {
    const adminBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
    if (!adminBaseUrl) {
      throw new Error("NEXT_PUBLIC_ADMIN_URL is required for this e2e test.");
    }

    await injectSession(context, adminUser);

    await page.goto(`${adminBaseUrl}/en/users`, { waitUntil: "networkidle" });
    await expect(page.getByTestId("users-page")).toBeVisible({
      timeout: ELEMENT_TIMEOUT_MS,
    });

    const searchInput = page.getByTestId("users-search-input");
    await searchInput.fill(buyerUser.email);

    const targetRow = page.getByTestId(`user-row-${buyerUser.userId}`);
    await expect(targetRow).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    await targetRow.locator('input[type="checkbox"]').check();

    const exportButton = page.getByTestId("users-export-excel-button");
    await expect(exportButton).toBeVisible({ timeout: ELEMENT_TIMEOUT_MS });

    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^users-export-.*\.xls$/i);

    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();
    if (!stream) return;

    const chunks: DownloadChunk[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as DownloadChunk);
    }

    const xml = Buffer.from(asBuffer(chunks)).toString("utf-8");
    expect(xml).toContain('<Worksheet ss:Name="Receipts"><Table>');
    expect(xml).toContain(storagePath);
    expect(xml).toContain(expectedReceiptBase64);
  });
});
