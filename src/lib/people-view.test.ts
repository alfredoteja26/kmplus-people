import { describe, expect, it } from "vitest";
import { createInitialState } from "./fixtures";
import {
  currentSeats,
  cvDates,
  filterRoster,
  openSeats,
  plainPeopleError,
  portfolioStatuses,
  profileCounts,
  rosterRows,
  rosterStatusCounts,
  seatLine,
  staffingRows,
  timeRows,
} from "./people-view";
import type { AppState, Invite, Project, Staffing, TimeBlock } from "./types";

const as = (state: AppState, role: AppState["currentRole"], personId: string): AppState => ({
  ...state,
  currentRole: role,
  currentPersonId: personId,
});

const project = (id: string, code: string): Project => ({
  id,
  tenantId: "kmplus",
  code,
  name: code,
  clientName: null,
  startDate: "2026-01-01",
  endDate: null,
});

const staffing = (id: string, projectId: string, startDate: string, endDate: string | null): Staffing => ({
  id,
  tenantId: "kmplus",
  personId: "person-alfredo",
  projectId,
  startDate,
  endDate,
  load: 50,
});

const block = (id: string, personId: string, startAt: string, endAt: string): TimeBlock => ({
  id,
  tenantId: "kmplus",
  personId,
  typeId: "",
  startAt,
  endAt,
  projectId: null,
  workItemId: null,
  title: "",
});

describe("people view", () => {
  it("scopes the roster by who may read, and an employee sees only themselves", () => {
    const state = createInitialState();
    expect(rosterRows(state).length).toBe(state.people.length);
    const own = rosterRows(as(state, "employee", "person-alfredo"));
    expect(own.map((row) => row.person.id)).toEqual(["person-alfredo"]);
  });

  it("searches name, email, and Position, and filters by employment status", () => {
    const state = createInitialState();
    const rows = rosterRows(state);
    expect(filterRoster(rows, "alfredo", "all").map((row) => row.person.id)).toEqual(["person-alfredo"]);
    expect(filterRoster(rows, "SENIOR CONSULTANT", "all").map((row) => row.person.id)).toContain("person-alfredo");
    expect(filterRoster(rows, "@kmplus.co.id", "all").length).toBeGreaterThan(0);
    expect(filterRoster(rows, "", "resigned")).toEqual([]);
    expect(rosterStatusCounts(rows).active).toBe(rows.length);
  });

  it("lists every current seat with its OrgUnit", () => {
    const state = createInitialState();
    const seats = currentSeats(state, "person-alfredo");
    expect(seats.map((seat) => seat.position?.title)).toEqual(["Senior Consultant", "Associate Consultant"]);
    expect(seatLine(seats)).toBe("Senior Consultant · Associate Consultant · Delivery");
    expect(seatLine([])).toBe("");
  });

  it("shows KPI Portfolio status only to the Person, their Line Manager, or an Admin", () => {
    const state = createInitialState();
    expect(portfolioStatuses(as(state, "employee", "person-alfredo"), "person-alfredo")?.rows.map((row) => row.status)).toEqual([
      "pending",
      "draft",
    ]);
    expect(portfolioStatuses(as(state, "manager", "person-rayhan"), "person-alfredo")).not.toBeNull();
    // HR without the Admin grant reads the profile but not the KPI work.
    expect(portfolioStatuses(as(state, "hr", "person-denny"), "person-alfredo")).toBeNull();
  });

  it("orders staffing today, later, then ended, and counts distinct projects on today", () => {
    const state: AppState = {
      ...createInitialState(),
      projects: [project("p1", "A"), project("p2", "B"), project("p3", "C")],
      staffings: [
        staffing("s1", "p1", "2025-01-01", "2025-06-30"),
        staffing("s2", "p2", "2026-01-01", null),
        staffing("s3", "p3", "2026-11-01", null),
        staffing("s4", "p2", "2026-09-01", "2026-12-31"),
      ],
    };
    expect(staffingRows(state, "person-alfredo", "2026-10-12").map((row) => [row.staffing.id, row.when])).toEqual([
      ["s4", "current"],
      ["s2", "current"],
      ["s3", "upcoming"],
      ["s1", "ended"],
    ]);
    expect(profileCounts(state, "person-alfredo", "2026-10-12").projectsToday).toBe(1);
  });

  it("counts own time and accepted meetings, never pending or declined ones", () => {
    const invite = (id: string, timeBlockId: string, status: Invite["status"]): Invite => ({
      id,
      tenantId: "kmplus",
      timeBlockId,
      personId: "person-alfredo",
      status,
    });
    const state: AppState = {
      ...createInitialState(),
      timeBlocks: [
        block("own", "person-alfredo", "2026-10-05T09:00", "2026-10-05T12:00"),
        block("met", "person-rayhan", "2026-10-07T13:00", "2026-10-07T14:30"),
        block("wait", "person-rayhan", "2026-10-08T13:00", "2026-10-08T14:00"),
        block("no", "person-rayhan", "2026-10-09T13:00", "2026-10-09T14:00"),
        block("last-month", "person-alfredo", "2026-09-30T09:00", "2026-09-30T10:00"),
      ],
      invites: [invite("i1", "met", "accepted"), invite("i2", "wait", "pending"), invite("i3", "no", "declined")],
    };
    const rows = timeRows(state, "person-alfredo");
    expect(rows.map((row) => [row.block.id, row.hours, row.accepted])).toEqual([
      ["met", 1.5, true],
      ["own", 3, false],
      ["last-month", 1, false],
    ]);
    expect(profileCounts(state, "person-alfredo", "2026-10-12").monthHours).toBe(4.5);
  });

  it("offers only empty Positions as seats", () => {
    const state = createInitialState();
    const open = openSeats(state).map((seat) => seat.position?.id);
    expect(open).toContain("pos-pm");
    expect(open).not.toContain("pos-sr-cons-alfredo");
  });

  it("reads partial CV dates without inventing any", () => {
    expect(cvDates("2019", "2023")).toBe("2019 – 2023");
    expect(cvDates("2019", "")).toBe("2019");
    expect(cvDates("", "")).toBe("Dates not given");
  });

  it("turns command refusals into plain language", () => {
    expect(plainPeopleError("User not found")).toBe("This person has no login yet. Create their login first.");
    expect(plainPeopleError("Something new")).toBe("Something new");
    expect(plainPeopleError(null)).toBe("");
  });
});
