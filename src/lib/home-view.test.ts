import { describe, expect, it } from "vitest";
import { decideLeaveRequest, fileLeaveRequest, upsertTimeBlock } from "./commands";
import { createInitialState } from "./fixtures";
import { agendaForDay, homeShortcuts, nextLeave, weekByDay } from "./home-view";
import type { AppState } from "./types";

function as(state: AppState, personId: string, role: AppState["currentRole"] = "employee"): AppState {
  return { ...state, currentPersonId: personId, currentRole: role };
}

describe("home view", () => {
  it("lists today's entries in time order and splits the week by day", () => {
    let state = as(createInitialState(), "person-alfredo");
    const activity = state.timeBlockTypes.find((row) => !row.allowsInvites)!;
    state = upsertTimeBlock(state, { typeId: activity.id, startAt: "2026-10-14T13:00", endAt: "2026-10-14T15:00", title: "Afternoon" }).state;
    state = upsertTimeBlock(state, { typeId: activity.id, startAt: "2026-10-14T08:00", endAt: "2026-10-14T10:30", title: "Morning" }).state;

    expect(agendaForDay(state, "person-alfredo", "2026-10-14").map((row) => row.block.title)).toEqual(["Morning", "Afternoon"]);
    const week = weekByDay(state, "person-alfredo", "2026-10-14");
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe("2026-10-12");
    expect(week[2]).toMatchObject({ date: "2026-10-14", hours: 4.5, isToday: true });
    expect(week[1].past).toBe(true);
  });

  it("picks the next leave that is approved or waiting and skips declined", () => {
    let state = as(createInitialState(), "person-rayhan");
    const declined = fileLeaveRequest(state, { kind: "remote", spanMode: "days", startDate: "2026-10-15", endDate: "2026-10-15", note: "x" });
    state = decideLeaveRequest(as(declined.state, "person-alfredo"), declined.leaveRequestId!, "refused").state;
    state = as(state, "person-rayhan");
    const later = fileLeaveRequest(state, { kind: "remote", spanMode: "days", startDate: "2026-10-20", endDate: "2026-10-21", note: "y" });
    expect(nextLeave(later.state, "person-rayhan", "2026-10-12")?.id).toBe(later.leaveRequestId);
  });

  it("offers only the shortcuts the sidebar would show", () => {
    const employee = homeShortcuts(as(createInitialState(), "person-digit"));
    expect(employee.map((row) => row.href)).toEqual(["/timesheet", "/leave/file", "/kpi"]);
    const admin = homeShortcuts(as(createInitialState(), "person-alfredo"));
    expect(admin.map((row) => row.href)).toContain("/leave/decide");
  });
});
