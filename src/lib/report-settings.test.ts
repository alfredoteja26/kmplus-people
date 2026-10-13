import { describe, expect, it } from "vitest";
import { NO_FILTERS } from "./report-model";
import { parseReportSettings, reportFilterError, reportMonthLink, reportRangeError, serializeReportSettings } from "./report-settings";

const TODAY = "2026-10-13";
const KNOWN = { projectIds: ["p1", "p2"], personIds: ["person-eka", "person-rayhan"] };
const parse = (query: string) => parseReportSettings(new URLSearchParams(query), TODAY, KNOWN);

describe("Report settings in the page address", () => {
  it("keeps a range through serialize and parse", () => {
    const config = { ...NO_FILTERS, from: "2026-09-21", to: "2026-10-20" };
    expect(parse(serializeReportSettings(config))).toEqual(config);
  });

  it("opens the month the Reports panel passed, or this Asia/Jakarta month when nothing is passed", () => {
    expect(reportMonthLink(2026, 1)).toBe("/project-admin/export?month=2026-02");
    expect(parse(reportMonthLink(2026, 1).split("?")[1])).toEqual({ ...NO_FILTERS, from: "2026-02-01", to: "2026-02-28" });
    expect(parse("")).toEqual({ ...NO_FILTERS, from: "2026-10-01", to: "2026-10-31" });
  });

  it("falls back to the default month when the address holds a bad, reversed, or too-long range", () => {
    const october = { ...NO_FILTERS, from: "2026-10-01", to: "2026-10-31" };
    expect(parse("from=2026-13-40&to=2026-10-20")).toEqual(october);
    expect(parse("from=2026-10-20&to=2026-10-01")).toEqual(october);
    expect(parse("from=2025-10-01&to=2026-10-01")).toEqual(october);
  });

  it("allows a range of at most 12 months and names what is wrong otherwise", () => {
    expect(reportRangeError("2025-11-01", "2026-10-31")).toBeNull();
    expect(reportRangeError("2025-10-01", "2026-10-01")).toBe("A report covers at most 12 months.");
    expect(reportRangeError("2026-10-20", "2026-10-01")).toBe("The end date is before the start date.");
    expect(reportRangeError("", "2026-10-01")).toBe("Choose a start and an end date.");
  });

  it("keeps Project and People filters and the no-project switch through serialize and parse", () => {
    const projects = { ...NO_FILTERS, from: "2026-10-01", to: "2026-10-31", projectIds: ["p2"], personIds: ["person-eka", "person-rayhan"], includeNoProject: false };
    expect(parse(serializeReportSettings(projects))).toEqual(projects);
    const noInternal = { ...NO_FILTERS, from: "2026-10-01", to: "2026-10-31", includeNoProject: false };
    expect(parse(serializeReportSettings(noInternal))).toEqual(noInternal);
  });

  it("drops Project and Person ids the tenant does not have", () => {
    expect(parse("from=2026-10-01&to=2026-10-31&projects=p1,gone&people=ghost,person-eka")).toMatchObject({ projectIds: ["p1"], personIds: ["person-eka"] });
  });

  it("forces time with no project off while the address names a Project filter", () => {
    expect(parse("from=2026-10-01&to=2026-10-31&projects=p1").includeNoProject).toBe(false);
    expect(parse("from=2026-10-01&to=2026-10-31&noProject=0").includeNoProject).toBe(false);
    expect(parse("from=2026-10-01&to=2026-10-31").includeNoProject).toBe(true);
  });

  it("refuses a filter that chooses no Project or no Person", () => {
    expect(reportFilterError(NO_FILTERS)).toBeNull();
    expect(reportFilterError({ projectIds: [], personIds: null })).toBe("Choose at least one project.");
    expect(reportFilterError({ projectIds: null, personIds: [] })).toBe("Choose at least one person.");
  });
});
