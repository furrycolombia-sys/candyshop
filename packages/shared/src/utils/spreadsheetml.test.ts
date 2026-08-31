import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildWorkbook,
  downloadExcel,
  escapeXml,
  toCell,
  toNumberCell,
} from "@shared/utils/spreadsheetml";

describe("escapeXml", () => {
  it("escapes every character XML gives meaning to", () => {
    expect(escapeXml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&apos;");
  });

  it("escapes ampersands before the entities it introduces", () => {
    // A naive implementation that replaced < first would produce "&amp;lt;"
    // for a literal "<", double-escaping it.
    expect(escapeXml("a & b < c")).toBe("a &amp; b &lt; c");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeXml("Café — 100% cotton")).toBe("Café — 100% cotton");
  });
});

describe("toCell", () => {
  it("wraps a string and escapes it", () => {
    expect(toCell(`Ben & Jerry's`)).toBe(
      `<Cell><Data ss:Type="String">Ben &amp; Jerry&apos;s</Data></Cell>`,
    );
  });

  it("neutralises a value that would otherwise close the cell early", () => {
    expect(toCell("</Data></Cell><Cell>injected")).toBe(
      `<Cell><Data ss:Type="String">&lt;/Data&gt;&lt;/Cell&gt;&lt;Cell&gt;injected</Data></Cell>`,
    );
  });
});

describe("toNumberCell", () => {
  it("emits a numeric cell", () => {
    expect(toNumberCell(1234.5)).toBe(
      `<Cell><Data ss:Type="Number">1234.5</Data></Cell>`,
    );
  });
});

describe("buildWorkbook", () => {
  it("wraps sheets in the SpreadsheetML envelope", () => {
    const xml = buildWorkbook([{ name: "Report", rows: ["<Row/>"] }]);

    expect(xml.startsWith('<?xml version="1.0"?>')).toBe(true);
    expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
    expect(xml).toContain('<Worksheet ss:Name="Report"><Table><Row/>');
    expect(xml).toContain("</Table></Worksheet>");
    expect(xml.endsWith("</Workbook>")).toBe(true);
  });

  it("escapes a sheet name so it cannot break out of the attribute", () => {
    const xml = buildWorkbook([{ name: `A "quoted" & odd name`, rows: [] }]);

    expect(xml).toContain(
      '<Worksheet ss:Name="A &quot;quoted&quot; &amp; odd name">',
    );
  });

  it("emits multiple sheets in order", () => {
    const xml = buildWorkbook([
      { name: "First", rows: ["<Row>1</Row>"] },
      { name: "Second", rows: ["<Row>2</Row>"] },
    ]);

    expect(xml.indexOf("First")).toBeLessThan(xml.indexOf("Second"));
  });
});

describe("downloadExcel", () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  const realClick = HTMLAnchorElement.prototype.click;

  beforeEach(() => {
    createObjectURL = vi.fn(() => "blob:fake-url");
    revokeObjectURL = vi.fn();
    globalThis.URL.createObjectURL = createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL;
  });

  afterEach(() => {
    HTMLAnchorElement.prototype.click = realClick;
    vi.restoreAllMocks();
  });

  it("offers the content under the requested filename", () => {
    const clicked: HTMLAnchorElement[] = [];
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      clicked.push(this);
    };

    downloadExcel("<Workbook/>", "report.xls");

    expect(clicked).toHaveLength(1);
    expect(clicked[0]!.getAttribute("download")).toBe("report.xls");
    expect(clicked[0]!.getAttribute("href")).toBe("blob:fake-url");
  });

  it("sends the content as an Excel blob", () => {
    HTMLAnchorElement.prototype.click = vi.fn();

    downloadExcel("<Workbook/>", "report.xls");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]![0] as Blob;
    expect(blob.type).toBe("application/vnd.ms-excel;charset=utf-8;");
  });

  it("cleans up after itself so the blob and the anchor do not leak", () => {
    HTMLAnchorElement.prototype.click = vi.fn();
    const before = document.body.children.length;

    downloadExcel("<Workbook/>", "report.xls");

    expect(document.body.children.length).toBe(before);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });
});
