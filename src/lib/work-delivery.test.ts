import { describe, expect, it } from "vitest";
import {
  addDeliverable,
  addStaffing,
  decideLeaveRequest,
  deleteStaffing,
  fileLeaveRequest,
  openProject,
  removeDeliverableCategory,
  removePublicHoliday,
  removeTimeBlockType,
  renamePublicHoliday,
  applyIndonesiaHolidayFeed,
  addPublicHoliday,
  renameTimeBlockType,
  respondToInvite,
  updateDeliverable,
  updateProject,
  updateStaffing,
  upsertTimeBlock,
  upsertWorkItem,
} from "./commands";
import { navGroupsForRole } from "@/components/shell/nav";
import { createInitialState } from "./fixtures";
import type { AppState } from "./types";
import {
  homeProjectsForPerson,
  kpiRemindersForPerson,
  menuVisibility,
  personLoadOverload,
  personWeekHours,
  projectProgressPercent,
  weekTargetHours,
  workbookRows,
} from "./work-delivery-query";

function asAlfredo(state: AppState): AppState {
  return { ...state, currentPersonId: "person-alfredo", currentRole: "employee" };
}

function asDenny(state: AppState): AppState {
  return { ...state, currentPersonId: "person-denny", currentRole: "hr" };
}

function asDigit(state: AppState): AppState {
  return { ...state, currentPersonId: "person-digit", currentRole: "employee" };
}

function openSampleProject(state: AppState) {
  return openProject(asAlfredo(state), {
    code: "KMP",
    name: "KMPlus People",
    clientName: null,
    startDate: "2026-01-01",
    endDate: "2026-12-31",
  });
}

describe("Project Admin commands", () => {
  it("lets Admin open a Project and refuses a Person without Admin", () => {
    const opened = openSampleProject(createInitialState());
    expect(opened.error).toBeNull();
    expect(opened.projectId).toBeTruthy();
    expect(opened.state.projects[0]?.tenantId).toBe("kmplus");
    expect(opened.state.projects[0]?.clientName).toBeNull();

    const refused = openProject(asDenny(createInitialState()), {
      code: "X",
      name: "Nope",
      startDate: "2026-01-01",
    });
    expect(refused.error).toMatch(/Admin grant/);
    expect(refused.state.projects).toHaveLength(0);
  });

  it("refuses a Project code that differs only by case", () => {
    const state = openSampleProject(createInitialState()).state;
    const again = openProject(asAlfredo(state), {
      code: "kmp",
      name: "Other",
      startDate: "2026-01-01",
    });
    expect(again.error).toMatch(/unique/i);
  });

  it("lets Admin change the code without orphaning Staffing", () => {
    let state = openSampleProject(createInitialState()).state;
    const projectId = state.projects[0]!.id;
    state = addStaffing(asAlfredo(state), {
      personId: "person-digit",
      projectId,
      startDate: "2026-01-01",
      load: 50,
    }).state;
    const renamed = updateProject(asAlfredo(state), projectId, { code: "KMPP" });
    expect(renamed.error).toBeNull();
    expect(renamed.state.projects[0]?.code).toBe("KMPP");
    expect(renamed.state.staffings[0]?.projectId).toBe(projectId);
  });
});

describe("Staffing", () => {
  it("keeps a Load sum past 100 and reports overload", () => {
    let state = openSampleProject(createInitialState()).state;
    const projectA = state.projects[0]!.id;
    state = openProject(asAlfredo(state), {
      code: "OTH",
      name: "Other",
      startDate: "2026-01-01",
    }).state;
    const projectB = state.projects.find((row) => row.code === "OTH")!.id;

    state = addStaffing(asAlfredo(state), {
      personId: "person-digit",
      projectId: projectA,
      startDate: "2026-01-01",
      load: 80,
    }).state;
    const second = addStaffing(asAlfredo(state), {
      personId: "person-digit",
      projectId: projectB,
      startDate: "2026-01-01",
      load: 40,
    });
    expect(second.error).toBeNull();
    expect(second.overload).toBe(20);
    expect(personLoadOverload(second.state, "person-digit")).toBe(20);
  });

  it("refuses overlapping Staffing on the same Project and allows delete of a mistaken row", () => {
    let state = openSampleProject(createInitialState()).state;
    const projectId = state.projects[0]!.id;
    state = addStaffing(asAlfredo(state), {
      personId: "person-digit",
      projectId,
      startDate: "2026-01-01",
      endDate: "2026-06-30",
      load: 50,
    }).state;
    const overlap = addStaffing(asAlfredo(state), {
      personId: "person-digit",
      projectId,
      startDate: "2026-06-01",
      load: 20,
    });
    expect(overlap.error).toMatch(/overlap/i);

    const staffingId = state.staffings[0]!.id;
    const ended = updateStaffing(asAlfredo(state), staffingId, { endDate: "2026-03-31" });
    expect(ended.error).toBeNull();
    expect(ended.state.staffings[0]?.endDate).toBe("2026-03-31");

    const removed = deleteStaffing(asAlfredo(ended.state), staffingId);
    expect(removed.error).toBeNull();
    expect(removed.state.staffings).toHaveLength(0);
  });
});

describe("WorkItem and Deliverable", () => {
  it("refuses an edit that names another Project than the WorkItem's own", () => {
    let state = openSampleProject(createInitialState()).state;
    const projectA = state.projects[0]!.id;
    const openedB = openProject(asAlfredo(state), {
      code: "KMB",
      name: "Other client",
      clientName: null,
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    state = openedB.state;
    const projectB = openedB.projectId!;
    state = addStaffing(asAlfredo(state), { personId: "person-digit", projectId: projectA, startDate: "2026-01-01", load: 50 }).state;
    state = addStaffing(asAlfredo(state), { personId: "person-alfredo", projectId: projectB, startDate: "2026-01-01", load: 50 }).state;
    state = upsertWorkItem(asAlfredo(state), {
      projectId: projectB,
      name: "Client B plan",
      picPersonId: "person-alfredo",
      startDate: "2026-02-01",
      endDate: "2026-03-01",
    }).state;
    const itemB = state.workItems.find((row) => row.projectId === projectB)!;

    const hijack = upsertWorkItem(asDigit(state), {
      id: itemB.id,
      projectId: projectA,
      name: "Renamed by someone on A",
      picPersonId: "person-digit",
      startDate: "2026-02-01",
      endDate: "2026-03-01",
    });
    expect(hijack.error).toBe("WorkItem not found");
    expect(hijack.state.workItems.find((row) => row.id === itemB.id)).toEqual(itemB);
  });

  it("refuses a WorkItem outside Project dates and keeps file versions while overwriting link URLs", () => {
    let state = openSampleProject(createInitialState()).state;
    const projectId = state.projects[0]!.id;
    state = addStaffing(asAlfredo(state), {
      personId: "person-digit",
      projectId,
      startDate: "2026-01-01",
      load: 50,
    }).state;

    const outside = upsertWorkItem(asAlfredo(state), {
      projectId,
      name: "Too late",
      picPersonId: "person-digit",
      startDate: "2026-01-01",
      endDate: "2027-01-01",
    });
    expect(outside.error).toMatch(/inside the Project/i);

    state = upsertWorkItem(asAlfredo(state), {
      projectId,
      name: "Build",
      picPersonId: "person-digit",
      startDate: "2026-02-01",
      endDate: "2026-03-01",
    }).state;
    const workItemId = state.workItems[0]!.id;

    const file = addDeliverable(asAlfredo(state), {
      projectId,
      kind: "file",
      name: "deck.pdf",
      categoryId: "dcat-deliverables",
      storagePath: "tenants/kmplus/deliverables/v1.pdf",
      workItemIds: [workItemId],
    });
    expect(file.error).toBeNull();
    expect(file.state.deliverables[0]?.versions[0]?.storagePath).toBe("tenants/kmplus/deliverables/v1.pdf");

    const versioned = updateDeliverable(asAlfredo(file.state), file.deliverableId!, {
      storagePath: "tenants/kmplus/deliverables/v2.pdf",
    });
    expect(versioned.state.deliverables[0]?.versions).toHaveLength(2);

    const link = addDeliverable(asAlfredo(versioned.state), {
      projectId,
      kind: "link",
      name: "Spec",
      categoryId: "dcat-reference",
      url: "https://example.com/a",
    });
    const overwritten = updateDeliverable(asAlfredo(link.state), link.deliverableId!, {
      url: "https://example.com/b",
    });
    expect(overwritten.state.deliverables.find((row) => row.kind === "link")?.url).toBe("https://example.com/b");
  });

  it("computes Home progress as Accepted over all, and none yields no percent", () => {
    let state = openSampleProject(createInitialState()).state;
    const projectId = state.projects[0]!.id;
    expect(projectProgressPercent(state, projectId)).toBeNull();

    state = addStaffing(asAlfredo(state), {
      personId: "person-digit",
      projectId,
      startDate: "2026-01-01",
      load: 50,
    }).state;
    state = addDeliverable(asAlfredo(state), {
      projectId,
      kind: "link",
      name: "A",
      categoryId: "dcat-notes",
      url: "https://example.com/a",
      statusId: "dstatus-draft",
    }).state;
    state = addDeliverable(asAlfredo(state), {
      projectId,
      kind: "link",
      name: "B",
      categoryId: "dcat-notes",
      url: "https://example.com/b",
      statusId: "dstatus-accepted",
    }).state;

    expect(projectProgressPercent(state, projectId)).toBe(0.5);
    const home = homeProjectsForPerson(state, "person-digit");
    expect(home[0]?.progress).toBe(0.5);
  });
});

describe("LeaveRequest and TimeBlock", () => {
  it("refuses cuti without cover, sick without letter, and blocks TimeBlock on approved cuti but not remote", () => {
    let state = asDigit(createInitialState());
    const noCover = fileLeaveRequest(state, {
      kind: "cuti",
      leaveTypeId: "leave-type-1",
      note: "Holiday",
      spanMode: "days",
      startDate: "2026-09-20",
      endDate: "2026-09-22",
    });
    expect(noCover.error).toMatch(/covering Person/i);

    const noLetter = fileLeaveRequest(state, {
      kind: "sick",
      note: "Flu",
      spanMode: "days",
      startDate: "2026-09-20",
      endDate: "2026-09-20",
    });
    expect(noLetter.error).toMatch(/doctor/i);

    const cuti = fileLeaveRequest(state, {
      kind: "cuti",
      leaveTypeId: "leave-type-1",
      coverPersonId: "person-alfredo",
      note: "Holiday",
      spanMode: "days",
      startDate: "2026-09-20",
      endDate: "2026-09-22",
    });
    expect(cuti.error).toBeNull();
    state = decideLeaveRequest(asAlfredo(cuti.state), cuti.leaveRequestId!, "paid").state;

    const blocked = upsertTimeBlock(asDigit(state), {
      typeId: "tbtype-activity",
      startAt: "2026-09-21T09:00",
      endAt: "2026-09-21T11:00",
      title: "Work",
    });
    expect(blocked.error).toMatch(/cuti or sick/i);

    const remote = fileLeaveRequest(asDigit(state), {
      kind: "remote",
      note: "WFH",
      spanMode: "days",
      startDate: "2026-09-25",
      endDate: "2026-09-25",
    });
    state = decideLeaveRequest(asAlfredo(remote.state), remote.leaveRequestId!, "unpaid").state;
    const allowed = upsertTimeBlock(asDigit(state), {
      typeId: "tbtype-activity",
      startAt: "2026-09-25T09:00",
      endAt: "2026-09-25T11:00",
      title: "Remote work",
    });
    expect(allowed.error).toBeNull();
  });

  it("refuses overlapping TimeBlocks, keeps past days editable, and counts accepted meeting hours only", () => {
    let state = asDigit(createInitialState());
    state = upsertTimeBlock(state, {
      typeId: "tbtype-activity",
      startAt: "2026-01-05T09:00",
      endAt: "2026-01-05T12:00",
      title: "Past work",
    }).state;
    expect(state.timeBlocks).toHaveLength(1);

    const overlap = upsertTimeBlock(asDigit(state), {
      typeId: "tbtype-activity",
      startAt: "2026-01-05T11:00",
      endAt: "2026-01-05T13:00",
      title: "Clash",
    });
    expect(overlap.error).toMatch(/overlap/i);

    const meeting = upsertTimeBlock(asAlfredo(createInitialState()), {
      typeId: "tbtype-meeting",
      startAt: "2026-09-28T10:00",
      endAt: "2026-09-28T12:00",
      title: "Sync",
      inviteePersonIds: ["person-rayhan"],
    });
    expect(meeting.error).toBeNull();
    state = meeting.state;
    const invite = state.invites.find((row) => row.personId === "person-rayhan");
    expect(invite).toBeTruthy();
    expect(personWeekHours(state, "person-rayhan", "2026-09-28")).toBe(0);

    const accepted = respondToInvite(
      { ...state, currentPersonId: "person-rayhan", currentRole: "manager" },
      invite!.id,
      "accepted",
    );
    expect(accepted.error).toBeNull();
    expect(personWeekHours(accepted.state, "person-rayhan", "2026-09-28")).toBe(2);
    expect(weekTargetHours()).toBe(40);
  });

  it("keeps Meeting invite privilege after rename and refuses accept during approved sick", () => {
    let state = asAlfredo(createInitialState());
    state = renameTimeBlockType(state, "tbtype-meeting", "Call").state;
    expect(state.timeBlockTypes.find((row) => row.id === "tbtype-meeting")?.allowsInvites).toBe(true);

    state = fileLeaveRequest(
      { ...state, currentPersonId: "person-rayhan", currentRole: "manager" },
      {
        kind: "sick",
        note: "Flu",
        doctorLetterPath: "tenants/kmplus/sick/letter.pdf",
        spanMode: "days",
        startDate: "2026-09-29",
        endDate: "2026-09-29",
      },
    ).state;
    const leaveId = state.leaveRequests[0]!.id;
    state = decideLeaveRequest(asAlfredo(state), leaveId, "paid").state;

    const meeting = upsertTimeBlock(asAlfredo(state), {
      typeId: "tbtype-meeting",
      startAt: "2026-09-29T09:00",
      endAt: "2026-09-29T10:00",
      title: "Standup",
      inviteePersonIds: ["person-rayhan"],
    });
    expect(meeting.error).toBeNull();
    state = meeting.state;
    const invite = state.invites.find((row) => row.personId === "person-rayhan");
    expect(invite).toBeTruthy();
    const refused = respondToInvite(
      { ...state, currentPersonId: "person-rayhan", currentRole: "manager" },
      invite!.id,
      "accepted",
    );
    expect(refused.error).toMatch(/cuti or sick/i);
  });

  it("keeps one Invite per Person, never invites the creator, and declines without counting hours", () => {
    let state = asAlfredo(createInitialState());
    const meeting = upsertTimeBlock(state, {
      typeId: "tbtype-meeting",
      startAt: "2026-09-30T13:00",
      endAt: "2026-09-30T15:00",
      title: "Review",
      inviteePersonIds: ["person-rayhan", "person-rayhan", "person-alfredo"],
    });
    expect(meeting.error).toBeNull();
    state = meeting.state;
    const invites = state.invites.filter((row) => row.timeBlockId === meeting.timeBlockId);
    expect(invites.map((row) => row.personId)).toEqual(["person-rayhan"]);

    const declined = respondToInvite(
      { ...state, currentPersonId: "person-rayhan", currentRole: "manager" },
      invites[0]!.id,
      "declined",
    );
    expect(declined.error).toBeNull();
    expect(personWeekHours(declined.state, "person-rayhan", "2026-09-30")).toBe(0);
    expect(personWeekHours(declined.state, "person-alfredo", "2026-09-30")).toBe(2);
  });

  it("refuses removing the Meeting type or the last label in a list", () => {
    let state = asAlfredo(createInitialState());
    expect(removeTimeBlockType(state, "tbtype-meeting").error).toMatch(/Meeting type/);
    const categories = [...state.deliverableCategories];
    for (const row of categories.slice(1)) {
      const removed = removeDeliverableCategory(state, row.id);
      expect(removed.error).toBeNull();
      state = removed.state;
    }
    expect(removeDeliverableCategory(state, categories[0]!.id).error).toMatch(/At least one/);
  });
});

describe("Home menu, workbook, reminders", () => {
  it("shows Projects to every signed-in User and the Admin area only to Admin", () => {
    expect(menuVisibility(asAlfredo(createInitialState())).projects).toBe(true);
    expect(menuVisibility(asAlfredo(createInitialState())).projectAdmin).toBe(true);
    expect(menuVisibility(asDenny(createInitialState())).projectAdmin).toBe(false);

    const alfredo = navGroupsForRole("employee", true)
      .flatMap((group) => group.items)
      .map((item) => item.label);
    const denny = navGroupsForRole("hr", false)
      .flatMap((group) => group.items)
      .map((item) => item.label);
    expect(alfredo).toContain("Projects");
    expect(alfredo).toContain("Admin");
    expect(alfredo).not.toContain("Project Admin");
    // Reimbursement requests live inside the Admin area, not in the sidebar.
    expect(alfredo).not.toContain("Reimbursement requests");
    expect(alfredo).toContain("Reimbursement");
    expect(denny).toContain("Projects");
    expect(denny).not.toContain("Admin");
  });

  it("returns workbook sheets with the named columns", () => {
    const sheets = workbookRows(createInitialState());
    expect(sheets.map((row) => row.name)).toEqual(["Projects", "Staffing", "Timesheet"]);
    expect(sheets[0]?.columns).toEqual(["code", "name", "client", "start", "end"]);
    expect(sheets[1]?.columns).toEqual(["person", "project code", "start", "end", "load"]);
    expect(sheets[2]?.columns).toEqual(["person", "date", "hours", "project code", "type"]);
  });

  it("omits planning reminders when the end date is empty", () => {
    const state = asAlfredo(createInitialState());
    const cycle = state.cycles.find((row) => row.id === "cycle-2027");
    expect(cycle?.planningEndsOn == null || cycle.planningEndsOn === "").toBe(true);
    const reminders = kpiRemindersForPerson(state, "person-alfredo", "2026-12-28");
    expect(reminders.filter((row) => row.kind === "planning")).toHaveLength(0);
  });

  it("reminds a check-in per current window: an earlier quarter does not count as submitted", () => {
    const state = asDigit(createInitialState());
    const submitFor = (today: string) =>
      kpiRemindersForPerson(state, "person-digit", today).filter(
        (row) => row.kind === "check-in" && row.label.startsWith("Submit"),
      );
    // Q3 window already has a check-in for ki-digit-1: 3 days before 30 Sep stays quiet for that item.
    const q3 = submitFor("2026-09-27").length;
    // Q4 has no check-in yet: 3 days before 31 Dec reminds again.
    const q4 = submitFor("2026-12-28").length;
    expect(q4).toBeGreaterThan(q3);
    // Two days before is not a reminder day (3, 1, 0 only).
    expect(submitFor("2026-12-29")).toHaveLength(0);
  });

  it("does not remind approvers about a returned check-in", () => {
    const base = createInitialState();
    const state: AppState = {
      ...base,
      checkIns: base.checkIns.map((row) =>
        row.id === "ci-digit-1"
          ? { ...row, date: "2026-12-01", window: "2026-Q4", status: "returned" as const, lineManagerApprovedBy: undefined, adminApprovedBy: undefined }
          : row,
      ),
    };
    const admin = kpiRemindersForPerson(state, "person-alfredo", "2026-12-28").filter(
      (row) => row.kind === "check-in" && row.label.startsWith("Admin"),
    );
    expect(admin).toHaveLength(0);
    const owner = kpiRemindersForPerson(state, "person-digit", "2026-12-28").map((row) => row.label);
    expect(owner).toContain("Resubmit check-in by 2026-12-31");
  });
});

describe("Indonesia PublicHolidays", () => {
  it("adds missing Indonesia dates, skips a suppressed date, and keeps a local name", () => {
    let state = asAlfredo(createInitialState());
    const added = addPublicHoliday(state, "2026-08-17", "Hari Kemerdekaan");
    expect(added.error).toBeNull();
    state = added.state;
    const internal = state.publicHolidays.find((row) => row.date === "2026-08-17");
    expect(internal?.origin).toBe("internal");

    const fed = applyIndonesiaHolidayFeed(state, [
      { date: "2026-01-01", name: "Tahun Baru", origin: "libur" },
      { date: "2026-02-16", name: "Cuti Bersama Imlek", origin: "bersama" },
    ]);
    expect(fed.error).toBeNull();
    expect(fed.added).toBe(2);
    state = fed.state;

    const nyepi = applyIndonesiaHolidayFeed(state, [{ date: "2026-03-19", name: "Hari Suci Nyepi", origin: "libur" }]).state;
    const renamed = renamePublicHoliday(asAlfredo(nyepi), nyepi.publicHolidays.find((row) => row.date === "2026-03-19")!.id, "Nyepi di kantor");
    expect(renamed.state.publicHolidays.find((row) => row.date === "2026-03-19")?.name).toBe("Nyepi di kantor");

    const suppressed = removePublicHoliday(asAlfredo(renamed.state), renamed.state.publicHolidays.find((row) => row.date === "2026-01-01")!.id);
    expect(suppressed.state.publicHolidays.find((row) => row.date === "2026-01-01")?.suppressed).toBe(true);

    const again = applyIndonesiaHolidayFeed(asAlfredo(suppressed.state), [
      { date: "2026-01-01", name: "Tahun Baru", origin: "libur" },
      { date: "2026-03-19", name: "Hari Suci Nyepi", origin: "libur" },
    ]);
    expect(again.added).toBe(0);
    expect(again.state.publicHolidays.find((row) => row.date === "2026-03-19")?.name).toBe("Nyepi di kantor");
    expect(again.state.publicHolidays.find((row) => row.date === "2026-01-01")?.suppressed).toBe(true);
  });
});
