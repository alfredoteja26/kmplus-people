import { describe, expect, it } from "vitest";
import { formatDate, formatDateRange, formatDay } from "@/lib/labels";

describe("formatDate", () => {
  it("writes September as Sep, not the ICU en-GB Sept", () => {
    expect(formatDate("2026-09-21")).toBe("21 Sep 2026");
  });

  it("writes every month as three letters", () => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    months.forEach((name, index) => {
      const iso = `2026-${String(index + 1).padStart(2, "0")}-05`;
      expect(formatDate(iso)).toBe(`5 ${name} 2026`);
    });
  });

  it("returns non-ISO input unchanged and empty for missing input", () => {
    expect(formatDate("soon")).toBe("soon");
    expect(formatDate(null)).toBe("");
  });
});

describe("formatDay", () => {
  it("keeps the en-GB weekday shape and writes a three-letter month", () => {
    expect(formatDay("2026-09-21")).toBe("Mon, 21 Sep");
    expect(formatDay("2026-10-05")).toBe("Mon, 5 Oct");
    expect(formatDay("2026-10-08")).toBe("Thu, 8 Oct");
  });
});

describe("formatDateRange", () => {
  it("uses Sep in both ends", () => {
    expect(formatDateRange("2026-09-01", "2026-09-30")).toBe("1 Sep 2026 – 30 Sep 2026");
    expect(formatDateRange("2026-09-01", null)).toBe("From 1 Sep 2026");
  });
});
