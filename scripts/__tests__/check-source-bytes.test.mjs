import { describe, expect, it } from "vitest";

import { findControlByte } from "../check-source-bytes.mjs";

describe("findControlByte", () => {
  it("accepts ordinary text", () => {
    expect(findControlByte(Buffer.from("const a = 1;\n"))).toBeNull();
  });

  it("accepts tab, newline and carriage return", () => {
    // The three a text file legitimately holds; CRLF checkouts depend on it.
    expect(findControlByte(Buffer.from("a\tb\r\nc\n"))).toBeNull();
  });

  it("finds the byte a mangled \b escape leaves behind", () => {
    // 0x08 is what a shell heredoc wrote in place of `\b` in a URL regex,
    // four separate times, while removing Playwright's timing waits.
    const buf = Buffer.from(`const re = /\u0008auth/;\n`);

    expect(findControlByte(buf)).toEqual({ byte: 8, line: 1, column: 13 });
  });

  it("reports the line the byte is on, not the first line", () => {
    const buf = Buffer.from(`line one\nline two\nthree \u0010 here\n`);

    expect(findControlByte(buf)?.line).toBe(3);
  });

  it("finds a NUL", () => {
    // aeleos's case: a literal NUL inside content-['—\00a0'] reached main and
    // rendered a replacement glyph on every public page.
    expect(findControlByte(Buffer.from("content-['\u0000a0']"))?.byte).toBe(0);
  });
});
