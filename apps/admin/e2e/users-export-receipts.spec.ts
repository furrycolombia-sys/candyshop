import { expect, test } from "@playwright/test";

function asBuffer(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return merged;
}

test.describe("users export receipts backup", () => {
  test("downloads excel file with receipt base64 backup rows", async ({
    page,
  }) => {
    await page.setContent(`
      <button id="export-btn" data-testid="users-export-excel-button" type="button">Export Selected as Excel</button>
      <script>
        const users = [{ id: "user-1", email: "buyer@example.com", display_name: "Buyer One", last_seen_at: "2026-04-18T12:00:00Z" }];
        const permissions = { "user-1": ["receipts.read"] };
        const receipts = [{
          userId: "user-1",
          orderId: "order-1",
          storagePath: "order-1/receipt.png",
          fileName: "receipt.png",
          mimeType: "image/png",
          byteSize: 123,
          fileBase64: "dGVzdF9yZWNlaXB0X2J5dGVz"
        }];

        function escapeXml(value) {
          return value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&apos;");
        }

        function toCell(value) {
          return '<Cell><Data ss:Type="String">' + escapeXml(String(value)) + "</Data></Cell>";
        }

        function toYesNo(hasPermission) {
          return hasPermission ? "Yes" : "No";
        }

        function exportUsersToExcel() {
          const userHeaders = ["ID", "Email", "Display Name", "Last Seen", "Receipts Create", "Receipts Read", "Receipts Delete"];
          const userHeaderRow = "<Row>" + userHeaders.map(toCell).join("") + "</Row>";
          const userBodyRows = users.map((user) => {
            const keys = permissions[user.id] ?? [];
            const values = [
              user.id,
              user.email,
              user.display_name ?? "",
              user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : "Never",
              toYesNo(keys.includes("receipts.create")),
              toYesNo(keys.includes("receipts.read")),
              toYesNo(keys.includes("receipts.delete")),
            ];
            return "<Row>" + values.map(toCell).join("") + "</Row>";
          }).join("");

          const receiptHeaders = ["User ID", "Order ID", "Storage Path", "File Name", "MIME Type", "File Size (bytes)", "Receipt File (base64)"];
          const receiptHeaderRow = "<Row>" + receiptHeaders.map(toCell).join("") + "</Row>";
          const receiptRows = receipts.map((receipt) => {
            const values = [
              receipt.userId,
              receipt.orderId,
              receipt.storagePath,
              receipt.fileName,
              receipt.mimeType,
              String(receipt.byteSize),
              receipt.fileBase64,
            ];
            return "<Row>" + values.map(toCell).join("") + "</Row>";
          }).join("");

          return [
            '<?xml version="1.0"?>',
            '<?mso-application progid="Excel.Sheet"?>',
            '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
            '<Worksheet ss:Name="Users"><Table>',
            userHeaderRow,
            userBodyRows,
            "</Table></Worksheet>",
            '<Worksheet ss:Name="Receipts"><Table>',
            receiptHeaderRow,
            receiptRows,
            "</Table></Worksheet>",
            "</Workbook>",
          ].join("");
        }

        function downloadExcel(content, filename) {
          const blob = new Blob([content], { type: "application/vnd.ms-excel;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url;
          anchor.download = filename;
          document.body.append(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        }

        document.getElementById("export-btn").addEventListener("click", () => {
          const content = exportUsersToExcel();
          downloadExcel(content, "users-export-test.xls");
        });
      </script>
    `);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("users-export-excel-button").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("users-export-test.xls");

    const stream = await download.createReadStream();
    expect(stream).not.toBeNull();
    if (!stream) return;

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }

    const xml = Buffer.from(asBuffer(chunks)).toString("utf-8");
    expect(xml).toContain('<Worksheet ss:Name="Users"><Table>');
    expect(xml).toContain('<Worksheet ss:Name="Receipts"><Table>');
    expect(xml).toContain("order-1/receipt.png");
    expect(xml).toContain("dGVzdF9yZWNlaXB0X2J5dGVz");
  });
});
