import { describe, expect, it } from "vitest";
import { periodLabel } from "@/components/kpi/kpi-copy";

describe("periodLabel", () => {
  it("writes month windows with a three-letter month", () => {
    expect(periodLabel("2026-09")).toBe("Sep 2026");
    expect(periodLabel("2026-10")).toBe("Oct 2026");
  });

  it("writes quarter windows as Qn year", () => {
    expect(periodLabel("2026-Q3")).toBe("Q3 2026");
  });
});
