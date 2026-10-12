import { describe, expect, it } from "vitest";
import { addStaffing, openProject, upsertTimeBlock, upsertWorkItem } from "./commands";
import { createInitialState } from "./fixtures";
import { formatDate } from "./labels";
import { initialsOf, projectHours, projectTeam, timingPhrase } from "./project-view";
import type { AppState, Project } from "./types";

function asAlfredo(state: AppState): AppState {
  return { ...state, currentPersonId: "person-alfredo", currentRole: "employee" };
}

const project = (startDate: string, endDate: string | null): Project => ({
  id: "p",
  tenantId: "kmplus",
  code: "P",
  name: "P",
  clientName: null,
  startDate,
  endDate,
});

describe("project view", () => {
  it("phrases a project's dates against today without inventing a status", () => {
    expect(timingPhrase(project("2026-11-02", null), "2026-10-12")).toBe("Starts in 3 weeks");
    expect(timingPhrase(project("2026-01-01", "2026-10-17"), "2026-10-12")).toBe("Ends in 5 days");
    expect(timingPhrase(project("2026-01-01", "2026-09-02"), "2026-10-12")).toBe(`Ended ${formatDate("2026-09-02")}`);
    expect(timingPhrase(project("2026-01-01", null), "2026-10-12")).toBe("No end date");
  });

  it("makes initials from the first and last name", () => {
    const person = createInitialState().people.find((row) => row.id === "person-alfredo");
    expect(initialsOf(person)).toBe("AT");
  });

  it("groups the team by today and counts project hours for creator and accepted invitees", () => {
    let state = asAlfredo(createInitialState());
    const opened = openProject(state, { code: "KMP", name: "KMPlus People", startDate: "2026-01-01", endDate: "2026-12-31" });
    state = opened.state;
    const projectId = opened.projectId!;
    state = addStaffing(state, { personId: "person-alfredo", projectId, startDate: "2026-01-01", load: 60 }).state;
    state = addStaffing(state, { personId: "person-rayhan", projectId, startDate: "2026-11-01", load: 20 }).state;
    const item = upsertWorkItem(state, { projectId, name: "Timesheet", picPersonId: "person-alfredo", startDate: "2026-01-01", endDate: "2026-12-31" });
    state = item.state;
    const activity = state.timeBlockTypes.find((row) => !row.allowsInvites)!;
    const logged = upsertTimeBlock(state, {
      typeId: activity.id,
      startAt: "2026-10-12T09:00",
      endAt: "2026-10-12T12:00",
      projectId,
      workItemId: item.workItemId,
    });
    expect(logged.error).toBeNull();
    state = logged.state;

    const team = projectTeam(state, projectId, "2026-10-12");
    expect(team.map((row) => [row.personId, row.when])).toEqual([
      ["person-alfredo", "current"],
      ["person-rayhan", "upcoming"],
    ]);
    expect(team[0].hours).toBe(3);
    expect(projectHours(state, projectId).total).toBe(3);
  });
});
