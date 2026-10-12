import { describe, expect, it } from "vitest";
import { upsertTimeBlock } from "./commands";
import { createInitialState } from "./fixtures";
import {
  adjustSpan,
  clockText,
  draftSpan,
  durationText,
  hoursText,
  jakartaNowMinutes,
  layoutLanes,
  minutesOf,
  visibleHourRange,
  weekBreakdown,
} from "./timesheet-grid";
import type { AppState } from "./types";

function asAlfredo(state: AppState): AppState {
  return { ...state, currentPersonId: "person-alfredo", currentRole: "employee" };
}

describe("timesheet grid math", () => {
  it("reads and prints the Jakarta wall clock", () => {
    expect(minutesOf("2026-10-12T09:30")).toBe(570);
    expect(clockText(570)).toBe("09:30");
    expect(clockText(24 * 60)).toBe("23:59");
    expect(durationText(150)).toBe("2h 30m");
    expect(durationText(60)).toBe("1h");
    expect(hoursText(18.5)).toBe("18.5h");
    expect(hoursText(18)).toBe("18h");
  });

  it("drafts in either drag direction and never below one hour", () => {
    expect(draftSpan(540, 720)).toEqual({ start: 540, end: 720 });
    expect(draftSpan(720, 540)).toEqual({ start: 540, end: 720 });
    expect(draftSpan(540, 560)).toEqual({ start: 540, end: 600 });
    // A click near midnight still yields a full hour that ends before midnight.
    expect(draftSpan(1430, 1430)).toEqual({ start: 1365, end: 1425 });
  });

  it("moves a block without changing its length and resizes without going under an hour", () => {
    // 09:00–12:00 dragged 50 minutes down snaps to 45 minutes.
    expect(adjustSpan("move", 540, 720, 50)).toEqual({ start: 585, end: 765 });
    expect(adjustSpan("move", 540, 720, -600)).toEqual({ start: 0, end: 180 });
    expect(adjustSpan("move", 1260, 1380, 300)).toEqual({ start: 1305, end: 1425 });
    expect(adjustSpan("end", 540, 720, 30)).toEqual({ start: 540, end: 750 });
    expect(adjustSpan("end", 540, 720, -200)).toEqual({ start: 540, end: 600 });
    expect(adjustSpan("start", 540, 720, -45)).toEqual({ start: 495, end: 720 });
    expect(adjustSpan("start", 540, 720, 200)).toEqual({ start: 660, end: 720 });
  });

  it("widens the visible hours to fit an early or late block", () => {
    expect(visibleHourRange([])).toEqual({ first: 7, last: 19 });
    expect(
      visibleHourRange([
        { startAt: "2026-10-12T05:30", endAt: "2026-10-12T07:00" },
        { startAt: "2026-10-12T19:00", endAt: "2026-10-12T21:15" },
      ]),
    ).toEqual({ first: 5, last: 22 });
  });

  it("puts overlapping spans side by side and lets touching spans share a lane", () => {
    const lanes = layoutLanes([
      { id: "a", start: 540, end: 660 },
      { id: "b", start: 600, end: 720 },
      { id: "c", start: 720, end: 780 },
    ]);
    expect(lanes.get("a")).toEqual({ lane: 0, lanes: 2 });
    expect(lanes.get("b")).toEqual({ lane: 1, lanes: 2 });
    expect(lanes.get("c")).toEqual({ lane: 0, lanes: 1 });
  });

  it("reads the Jakarta clock regardless of the machine timezone", () => {
    // 02:30 UTC is 09:30 in Jakarta.
    expect(jakartaNowMinutes(new Date("2026-10-12T02:30:00Z"))).toBe(570);
  });
});

describe("week breakdown", () => {
  it("counts weekend hours in the total and splits by project and type", () => {
    let state = asAlfredo(createInitialState());
    const meeting = state.timeBlockTypes.find((row) => row.allowsInvites)!;
    const monday = "2026-10-12";
    const weekday = upsertTimeBlock(state, { typeId: meeting.id, startAt: `${monday}T09:00`, endAt: `${monday}T11:30` });
    expect(weekday.error).toBeNull();
    state = weekday.state;
    const saturday = upsertTimeBlock(state, { typeId: meeting.id, startAt: "2026-10-17T10:00", endAt: "2026-10-17T12:00" });
    expect(saturday.error).toBeNull();
    state = saturday.state;

    const week = weekBreakdown(state, "person-alfredo", monday);
    const before = weekBreakdown(asAlfredo(createInitialState()), "person-alfredo", monday);
    expect(week.total - before.total).toBeCloseTo(4.5);
    expect(week.weekend - before.weekend).toBeCloseTo(2);
    expect(week.byProject.at(-1)?.label).toBe("No project");
    expect(week.byType.find((row) => row.key === meeting.id)?.hours).toBeGreaterThanOrEqual(4.5);
  });
});
