import { describe, expect, it } from "vitest";
import { REPORT_DEFAULTS } from "./report-model";
import { parseReportSettings, reportChoiceError, reportMonthLink, reportRangeError, serializeReportSettings } from "./report-settings";

const TODAY = "2026-10-13";
const KNOWN = { projectIds: ["p1", "p2"], personIds: ["person-eka", "person-rayhan"] };
const parse = (query: string) => parseReportSettings(new URLSearchParams(query), TODAY, KNOWN);

describe("Report settings in the page address", () => {
  it("keeps a range through serialize and parse", () => {
    const config = { ...REPORT_DEFAULTS, from: "2026-09-21", to: "2026-10-20" };
    expect(parse(serializeReportSettings(config))).toEqual(config);
  });

  it("opens the month the Reports panel passed, or this Asia/Jakarta month when nothing is passed", () => {
    expect(reportMonthLink(2026, 1)).toBe("/project-admin/export?month=2026-02");
    expect(parse(reportMonthLink(2026, 1).split("?")[1])).toEqual({ ...REPORT_DEFAULTS, from: "2026-02-01", to: "2026-02-28" });
    expect(parse("")).toEqual({ ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" });
  });

  it("falls back to the default month when the address holds a bad, reversed, or too-long range", () => {
    const october = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31" };
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
    const projects = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", projectIds: ["p2"], personIds: ["person-eka", "person-rayhan"], includeNoProject: false };
    expect(parse(serializeReportSettings(projects))).toEqual(projects);
    const noInternal = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", includeNoProject: false };
    expect(parse(serializeReportSettings(noInternal))).toEqual(noInternal);
  });

  it("keeps the title and Prepared for, and falls back when either is longer than 80 characters", () => {
    const named = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", title: "Samudra Energi, October hours", preparedFor: "PT Samudra Energi" };
    expect(parse(serializeReportSettings(named))).toEqual(named);
    expect(serializeReportSettings({ ...named, title: "Project report", preparedFor: "" })).toBe("from=2026-10-01&to=2026-10-31&sections=cover%2Csummary%2CtimesheetByPerson%2CdailyGrid%2Cleave");
    const long = "x".repeat(81);
    expect(parse(`from=2026-10-01&to=2026-10-31&title=${long}&preparedFor=${long}`)).toMatchObject({ title: "Project report", preparedFor: "" });
  });

  it("drops Project and Person ids the tenant does not have", () => {
    expect(parse("from=2026-10-01&to=2026-10-31&projects=p1,gone&people=ghost,person-eka")).toMatchObject({ projectIds: ["p1"], personIds: ["person-eka"] });
  });

  it("forces time with no project off while the address names a Project filter", () => {
    expect(parse("from=2026-10-01&to=2026-10-31&projects=p1").includeNoProject).toBe(false);
    expect(parse("from=2026-10-01&to=2026-10-31&noProject=0").includeNoProject).toBe(false);
    expect(parse("from=2026-10-01&to=2026-10-31").includeNoProject).toBe(true);
  });

  it("refuses choices with no Project, no Person, or no section", () => {
    expect(reportChoiceError(REPORT_DEFAULTS)).toBeNull();
    expect(reportChoiceError({ ...REPORT_DEFAULTS, projectIds: [] })).toBe("Choose at least one project.");
    expect(reportChoiceError({ ...REPORT_DEFAULTS, personIds: [] })).toBe("Choose at least one person.");
    expect(reportChoiceError({ ...REPORT_DEFAULTS, sections: [] })).toBe("Choose at least one section.");
  });

  it("keeps sections in the fixed order, drops unknown ones, and falls back to the defaults when none is known", () => {
    const chosen = { ...REPORT_DEFAULTS, from: "2026-10-01", to: "2026-10-31", sections: ["leave" as const, "cover" as const] };
    expect(parse(serializeReportSettings(chosen)).sections).toEqual(["cover", "leave"]);
    expect(parse("from=2026-10-01&to=2026-10-31&sections=leave,bogus,summary,leave").sections).toEqual(["summary", "leave"]);
    expect(parse("from=2026-10-01&to=2026-10-31&sections=bogus").sections).toEqual(["cover", "summary", "timesheetByPerson", "dailyGrid", "leave"]);
    expect(parse("from=2026-10-01&to=2026-10-31").sections).toEqual(REPORT_DEFAULTS.sections);
  });
});
