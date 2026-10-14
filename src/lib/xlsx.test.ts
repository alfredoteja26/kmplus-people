import { describe, expect, it } from "vitest";
import { buildXlsx } from "./xlsx";

function readUint32(bytes: Uint8Array, at: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(at, true);
}

describe("buildXlsx", () => {
  it("writes a zip with one worksheet per sheet and the named columns as the header row", () => {
    const bytes = buildXlsx([
      { name: "Projects", columns: ["code", "name"], rows: [["KMP", "A & B <x>"]] },
      { name: "Timesheet", columns: ["person", "hours"], rows: [["Alfredo", 2.5]] },
    ]);
    expect(readUint32(bytes, 0)).toBe(0x04034b50);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("xl/worksheets/sheet1.xml");
    expect(text).toContain("xl/worksheets/sheet2.xml");
    expect(text).toContain('<sheet name="Projects"');
    expect(text).toContain('<sheet name="Timesheet"');
    expect(text).toContain("A &amp; B &lt;x&gt;");
    expect(text).toContain("<v>2.5</v>");
  });
});
