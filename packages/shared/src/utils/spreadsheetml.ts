/**
 * SpreadsheetML (Excel 2003 XML) building blocks.
 *
 * These were copied into three report exporters -- admin's orders export and
 * payments' seller and delegated exports. The escaping rules and the workbook
 * envelope are one piece of knowledge, and `escapeXml` is an injection
 * boundary: a gap in it is a gap in every exporter at once. Each app still
 * owns its own columns and row shape, which legitimately differ.
 */

/** Escape the five characters XML gives meaning to. */
export function escapeXml(value: string): string {
  // The ampersand must go first: it introduces every other entity, so
  // replacing it later would double-escape the ones already written.
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** A string cell. The value is escaped, so it cannot alter the document. */
export function toCell(value: string): string {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

/** A numeric cell. */
export function toNumberCell(value: number): string {
  return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
}

export interface WorkbookSheet {
  /** Sheet name as shown on the tab. Escaped before it reaches the attribute. */
  name: string;
  /** Pre-built `<Row>` markup, in order. */
  rows: readonly string[];
}

/** Wrap one or more sheets in the SpreadsheetML workbook envelope. */
export function buildWorkbook(sheets: readonly WorkbookSheet[]): string {
  const worksheets = sheets.map(
    (sheet) =>
      `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>` +
      `${sheet.rows.join("")}</Table></Worksheet>`,
  );

  return [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
    ...worksheets,
    "</Workbook>",
  ].join("");
}

/** Hand the built workbook to the browser as a download. */
export function downloadExcel(content: string, filename: string): void {
  const blob = new Blob([content], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
