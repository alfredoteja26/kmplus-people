import { describe, expect, it } from "vitest";
import { addPublicHoliday, decideLeaveRequest, fileLeaveRequest, withdrawLeaveRequest } from "./commands";
import { createInitialState } from "./fixtures";
import { alsoOut, groupMine, monthWeeks, spanSummary } from "./leave-view";
import type { AppState } from "./types";

function as(state: AppState, personId: string): AppState {
  return { ...state, currentPersonId: personId, currentRole: personId === "person-denny" ? "hr" : "employee" };
}

const remote = (startDate: string, endDate: string) => ({
  kind: "remote" as const,
  spanMode: "days" as const,
  startDate,
  endDate,
  note: "Working from Bandung",
});

describe("leave requests", () => {
  it("lets the filer withdraw a request only while it waits for a decision", () => {
    const filed = fileLeaveRequest(as(createInitialState(), "person-rayhan"), remote("2026-10-20", "2026-10-21"));
    expect(filed.error).toBeNull();
    const withdrawn = withdrawLeaveRequest(filed.state, filed.leaveRequestId!);
    expect(withdrawn.error).toBeNull();
    expect(withdrawn.state.leaveRequests.some((row) => row.id === filed.leaveRequestId)).toBe(false);

    const again = fileLeaveRequest(as(createInitialState(), "person-rayhan"), remote("2026-10-20", "2026-10-21"));
    const decided = decideLeaveRequest(as(again.state, "person-alfredo"), again.leaveRequestId!, "paid");
    expect(decided.error).toBeNull();
    const late = withdrawLeaveRequest(as(decided.state, "person-rayhan"), again.leaveRequestId!);
    expect(late.error).toMatch(/decided/);
  });

  it("refuses a withdraw by someone who is neither the filer nor Admin", () => {
    const filed = fileLeaveRequest(as(createInitialState(), "person-rayhan"), remote("2026-10-20", "2026-10-20"));
    const refused = withdrawLeaveRequest(as(filed.state, "person-denny"), filed.leaveRequestId!);
    expect(refused.error).toMatch(/Person or Admin/);
    const admin = withdrawLeaveRequest(as(filed.state, "person-alfredo"), filed.leaveRequestId!);
    expect(admin.error).toBeNull();
  });

  it("refuses part-day leave that ends before it starts", () => {
    const filed = fileLeaveRequest(as(createInitialState(), "person-rayhan"), {
      ...remote("2026-10-20", "2026-10-20"),
      spanMode: "hours",
      startTime: "13:00",
      endTime: "09:00",
    });
    expect(filed.error).toMatch(/after its start/);
  });

  it("refuses cuti covered by the person taking it", () => {
    const filed = fileLeaveRequest(as(createInitialState(), "person-alfredo"), {
      ...remote("2026-10-20", "2026-10-20"),
      kind: "cuti",
      leaveTypeId: "leave-type-1",
      personId: "person-rayhan",
      coverPersonId: "person-rayhan",
    });
    expect(filed.error).toMatch(/someone else/);
  });

  it("refuses a decision from someone without the Admin grant", () => {
    const filed = fileLeaveRequest(as(createInitialState(), "person-rayhan"), remote("2026-10-20", "2026-10-20"));
    const refused = decideLeaveRequest(as(filed.state, "person-denny"), filed.leaveRequestId!, "refused");
    expect(refused.error).toMatch(/Admin grant/);
  });
});

describe("leave view", () => {
  it("counts working days without weekends or public holidays", () => {
    let state = as(createInitialState(), "person-alfredo");
    state = addPublicHoliday(state, "2026-12-25", "Natal").state;
    // Mon 21 Dec to Sun 27 Dec: seven days, Friday is a holiday, so four working days.
    const summary = spanSummary(state, "2026-12-21", "2026-12-27");
    expect(summary?.days).toBe(7);
    expect(summary?.working).toBe(4);
    expect(summary?.holidays.map((row) => row.date)).toContain("2026-12-25");
    expect(spanSummary(state, "2026-12-27", "2026-12-21")).toBeNull();
  });

  it("finds who else is out and ignores declined leave", () => {
    let state = as(createInitialState(), "person-rayhan");
    const mine = fileLeaveRequest(state, remote("2026-10-20", "2026-10-22"));
    state = as(mine.state, "person-digit");
    const theirs = fileLeaveRequest(state, remote("2026-10-22", "2026-10-23"));
    state = theirs.state;
    const row = state.leaveRequests.find((item) => item.id === mine.leaveRequestId)!;
    expect(alsoOut(state, row).map((item) => item.personId)).toEqual(["person-digit"]);
    state = decideLeaveRequest(as(state, "person-alfredo"), theirs.leaveRequestId!, "refused").state;
    expect(alsoOut(state, row)).toEqual([]);
  });

  it("lays out a Monday-first month and groups a Person's requests", () => {
    const october = monthWeeks(2026, 9);
    // 1 Oct 2026 is a Thursday.
    expect(october[0].slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(october.flat().filter(Boolean)).toHaveLength(31);

    const filed = fileLeaveRequest(as(createInitialState(), "person-rayhan"), remote("2026-10-20", "2026-10-20"));
    const groups = groupMine(filed.state.leaveRequests.filter((row) => row.personId === "person-rayhan"), "2026-10-12");
    expect(groups.waiting).toHaveLength(1);
  });
});
