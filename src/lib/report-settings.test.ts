import { describe, expect, it } from "vitest";
import { parseReportSettings, reportMonthLink, reportRangeError, serializeReportSettings } from "./report-settings";

const TODAY = "2026-10-13";

describe("Report settings in the page address", () => {
  it("keeps a range through serialize and parse", () => {
    const config = { from: "2026-09-21", to: "2026-10-20" };
    const query = serializeReportSettings(config);
    expect(parseReportSettings(new URLSearchParams(query), TODAY)).toEqual(config);
  });

  it("opens the month the Reports panel passed, or this Asia/Jakarta month when nothing is passed", () => {
    expect(reportMonthLink(2026, 1)).toBe("/project-admin/export?month=2026-02");
    expect(parseReportSettings(new URLSearchParams(reportMonthLink(2026, 1).split("?")[1]), TODAY)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(parseReportSettings(new URLSearchParams(""), TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
  });

  it("falls back to the default month when the address holds a bad, reversed, or too-long range", () => {
    const october = { from: "2026-10-01", to: "2026-10-31" };
    expect(parseReportSettings(new URLSearchParams("from=2026-13-40&to=2026-10-20"), TODAY)).toEqual(october);
    expect(parseReportSettings(new URLSearchParams("from=2026-10-20&to=2026-10-01"), TODAY)).toEqual(october);
    expect(parseReportSettings(new URLSearchParams("from=2025-10-01&to=2026-10-01"), TODAY)).toEqual(october);
  });

  it("allows a range of at most 12 months and names what is wrong otherwise", () => {
    expect(reportRangeError("2025-11-01", "2026-10-31")).toBeNull();
    expect(reportRangeError("2025-10-01", "2026-10-01")).toBe("A report covers at most 12 months.");
    expect(reportRangeError("2026-10-20", "2026-10-01")).toBe("The end date is before the start date.");
    expect(reportRangeError("", "2026-10-01")).toBe("Choose a start and an end date.");
  });
});
