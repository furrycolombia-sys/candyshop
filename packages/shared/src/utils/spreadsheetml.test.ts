import { describe, expect, it } from "vitest";

import {
  buildWorkbook,
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
