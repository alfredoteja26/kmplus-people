"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type * as commands from "./commands";
import { COMMANDS, refusal, type CommandArgs, type CommandName, type CommandOutput } from "./command-registry";
import type { ApplyCvMode, CreatePersonInput } from "./commands";
import { currentAssignment, recordingIds, roleLabel, withIdSource } from "./domain";
import { createInitialState } from "./fixtures";
import { overlaySessionIdentity } from "./session-identity";
import type { Role } from "./types";
import type { AppState, CurriculumVitae, FieldDecision, KpiItem, Person, Position } from "./types";

type Store = {
  state: AppState;
  persisted: boolean;
  /** Set when the server refused a change the browser had already shown; cleared by the next accepted one. */
  syncError: string | null;
  dismissSyncError: () => void;
  createPerson: (input: CreatePersonInput) => string;
  updatePerson: (personId: string, patch: Partial<Person>) => void;
  confirmHire: (personId: string) => string | null;
  assignPosition: (personId: string, positionId: string, startDate: string) => string | null;
  createPosition: (input: Omit<Position, "id" | "tenantId">) => string;
  updatePosition: (positionId: string, patch: Partial<Omit<Position, "id" | "tenantId">>) => string | null;
  requestCorrection: (personId: string, field: string, currentValue: string, proposedValue: string) => string | null;
  resolveCorrection: (id: string, status: "accepted" | "rejected") => string | null;
  addCv: (cv: Omit<CurriculumVitae, "id" | "tenantId">) => string;
  decideCvField: (cvId: string, key: string, decision: FieldDecision, editedValue?: string) => void;
  applyCv: (cvId: string, mode: ApplyCvMode) => string | null;
  rejectCv: (cvId: string) => void;
  startKpiPlanning: (cycleId: string) => string | null;
  startKpiMonitoring: (cycleId: string) => string | null;
  setKpiYearCheckInFrequency: (cycleId: string, cadence: import("./types").CheckInFrequency) => string | null;
  setKpiPlanningEndDate: (cycleId: string, planningEndsOn: string) => string | null;
  closeKpiYear: (cycleId: string) => string | null;
  openKpiAdjustmentWindow: (cycleId: string) => string | null;
  closeKpiAdjustmentWindow: (cycleId: string) => string | null;
  createMissingKpiSets: (cycleId: string) => number;
  upsertKpiItem: (item: Omit<KpiItem, "tenantId" | "id"> & { id?: string }) => string | null;
  removeKpiItem: (id: string) => void;
  submitKpiSet: (kpiSetId: string) => string | null;
  agreeKpiSet: (kpiSetId: string) => string | null;
  returnKpiSet: (kpiSetId: string, comment: string) => void;
  addCheckIn: (kpiItemId: string, actual: number, note: string) => string | null;
  agreeCheckIn: (checkInId: string) => string | null;
  returnCheckIn: (checkInId: string, comment: string) => void;
  grantAdmin: (personId: string) => string | null;
  revokeAdmin: (personId: string) => string | null;
  openProject: (input: commands.OpenProjectInput) => { projectId: string | null; error: string | null };
  updateProject: (projectId: string, input: commands.UpdateProjectInput) => { error: string | null };
  addStaffing: (input: commands.AddStaffingInput) => { staffingId: string | null; overload: number; error: string | null };
  updateStaffing: (
    staffingId: string,
    patch: Parameters<typeof commands.updateStaffing>[2],
  ) => { overload: number; error: string | null };
  deleteStaffing: (staffingId: string) => { error: string | null };
  upsertWorkItem: (input: commands.UpsertWorkItemInput) => { workItemId: string | null; error: string | null };
  deleteWorkItem: (workItemId: string) => { error: string | null };
  addDeliverable: (input: commands.AddDeliverableInput) => { deliverableId: string | null; error: string | null };
  updateDeliverable: (
    deliverableId: string,
    patch: Parameters<typeof commands.updateDeliverable>[2],
  ) => { error: string | null };
  deleteDeliverable: (deliverableId: string) => { error: string | null };
  fileLeaveRequest: (input: commands.FileLeaveInput) => { leaveRequestId: string | null; error: string | null };
  decideLeaveRequest: (leaveRequestId: string, decision: import("./types").LeaveDecision) => { error: string | null };
  withdrawLeaveRequest: (leaveRequestId: string) => { error: string | null };
  fileReimbursementRequest: (
    input: commands.FileReimbursementInput,
  ) => { reimbursementRequestId: string | null; error: string | null };
  editReimbursementRequest: (
    reimbursementRequestId: string,
    input: commands.EditReimbursementInput,
  ) => { error: string | null };
  withdrawReimbursementRequest: (reimbursementRequestId: string) => { error: string | null };
  decideReimbursementRequest: (
    reimbursementRequestId: string,
    input: commands.DecideReimbursementInput,
  ) => { error: string | null };
  markReimbursementPaid: (reimbursementRequestId: string, paidOn: string) => { error: string | null };
  clearReimbursementPaid: (reimbursementRequestId: string) => { error: string | null };
  upsertTimeBlock: (input: commands.UpsertTimeBlockInput) => { timeBlockId: string | null; error: string | null };
  deleteTimeBlock: (timeBlockId: string) => { error: string | null };
  respondToInvite: (inviteId: string, status: "accepted" | "declined") => { error: string | null };
  setWeekGrid: (mode: import("./types").WeekGridMode, personId?: string) => { error: string | null };
  updatePersonContact: (personId: string, patch: commands.ContactPatch) => { error: string | null };
  addDeliverableStatus: (name: string) => { statusId: string | null; error: string | null };
  renameDeliverableStatus: (statusId: string, name: string) => { error: string | null };
  removeDeliverableStatus: (statusId: string) => { error: string | null };
  addDeliverableCategory: (name: string) => { categoryId: string | null; error: string | null };
  renameDeliverableCategory: (categoryId: string, name: string) => { error: string | null };
  removeDeliverableCategory: (categoryId: string) => { error: string | null };
  addLeaveType: (name: string) => { leaveTypeId: string | null; error: string | null };
  renameLeaveType: (leaveTypeId: string, name: string) => { error: string | null };
  removeLeaveType: (leaveTypeId: string) => { error: string | null };
  addPublicHoliday: (date: string, name: string) => { holidayId: string | null; error: string | null };
  renamePublicHoliday: (holidayId: string, name: string) => { error: string | null };
  removePublicHoliday: (holidayId: string) => { error: string | null };
  applyIndonesiaHolidayFeed: (items: import("./commands").IndonesiaHolidayFeedItem[]) => { added: number; error: string | null };
  addTimeBlockType: (name: string) => { typeId: string | null; error: string | null };
  renameTimeBlockType: (typeId: string, name: string) => { error: string | null };
  removeTimeBlockType: (typeId: string) => { error: string | null };
};

const StoreContext = createContext<Store | null>(null);

type CommandReply = { state?: AppState; error?: string };

async function postCommand(name: CommandName, args: unknown[], ids: string[]): Promise<{ status: number; reply: CommandReply }> {
  const response = await fetch("/api/commands", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, args, ids }),
  });
  const reply = (await response.json().catch(() => ({}))) as CommandReply;
  return { status: response.status, reply };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [persisted, setPersisted] = useState(false);
  /** Latest committed state, updated synchronously so two commits in one tick build on each other. */
  const latest = useRef<AppState | null>(null);
  /** Commands reach the server one after another, in the order the user made them. */
  const sending = useRef<Promise<void>>(Promise.resolve());
  /** Commands sent but not yet answered; the server's view replaces local state once this reaches zero. */
  const inFlight = useRef(0);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/tenant-state");
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (response.ok) {
          const loaded = (await response.json()) as AppState;
          if (!cancelled) {
            latest.current = loaded;
            setState(loaded);
            setPersisted(true);
          }
          return;
        }
        throw new Error("unavailable");
      } catch (error: unknown) {
        if (cancelled) return;
        if (error instanceof Error && error.message === "unauthorized") return;
        let fallback = createInitialState();
        try {
          const meResponse = await fetch("/api/auth/me");
          if (meResponse.ok) {
            const me = (await meResponse.json()) as { personId: string; role: Role };
            fallback = overlaySessionIdentity(fallback, { personId: me.personId, role: me.role });
          }
        } catch {
          /* keep fixture identity */
        }
        latest.current = fallback;
        setState(fallback);
        setPersisted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const store = useMemo<Store | null>(() => {
    if (!state) return null;
    const current = state;

    function send(name: CommandName, args: unknown[], ids: string[]) {
      if (!persisted) return;
      inFlight.current += 1;
      sending.current = sending.current
        .then(async () => {
          const { status, reply } = await postCommand(name, args, ids);
          if (status === 401) {
            window.location.href = "/login";
            return;
          }
          if (status >= 500 || (!reply.state && status !== 400)) throw new Error(reply.error ?? "Save failed");
          if (status === 403 || status === 400) setSyncError(reply.error ?? "The server did not accept that change.");
          else setSyncError(null);
          if (reply.state && inFlight.current === 1) {
            latest.current = reply.state;
            setState(reply.state);
          }
        })
        .catch(() => setPersisted(false))
        .finally(() => {
          inFlight.current -= 1;
        });
    }

    /** Runs a command locally for an instant result, then sends it (with the ids it created) to the server. */
    function commit<N extends CommandName>(name: N, args: CommandArgs<N>): Omit<CommandOutput<N>, "state"> {
      const recorder = recordingIds();
      const command = COMMANDS[name] as unknown as (state: AppState, ...rest: unknown[]) => CommandOutput<N>;
      const output = withIdSource(recorder.source, () => command(latest.current ?? current, ...(args as unknown[])));
      const { state: next, ...rest } = output as CommandOutput<N> & { state: AppState };
      if (!refusal(output as { error?: unknown })) {
        latest.current = next;
        setState(next);
        send(name, args as unknown[], recorder.ids);
      }
      return rest as Omit<CommandOutput<N>, "state">;
    }

    return {
      state: current,
      persisted,
      syncError,
      dismissSyncError: () => setSyncError(null),
      createPerson(input) {
        return commit("createPerson", [input]).personId;
      },
      updatePerson(personId, patch) {
        commit("updatePerson", [personId, patch]);
      },
      confirmHire(personId) {
        return commit("confirmHire", [personId]).error ?? null;
      },
      assignPosition(personId, positionId, startDate) {
        return commit("assignPosition", [personId, positionId, startDate]).error ?? null;
      },
      createPosition(input) {
        return commit("createPosition", [input]).positionId;
      },
      updatePosition(positionId, patch) {
        return commit("updatePosition", [positionId, patch]).error ?? null;
      },
      requestCorrection(personId, field, currentValue, proposedValue) {
        return commit("requestCorrection", [personId, field, currentValue, proposedValue]).error ?? null;
      },
      resolveCorrection(id, status) {
        return commit("resolveCorrection", [id, status]).error ?? null;
      },
      addCv(cv) {
        return commit("addCv", [cv]).cvId;
      },
      decideCvField(cvId, key, decision, editedValue) {
        commit("decideCvField", [cvId, key, decision, editedValue]);
      },
      applyCv(cvId, mode) {
        const { personId } = commit("applyCv", [cvId, mode]);
        return mode.type === "new-hire" ? personId : null;
      },
      rejectCv(cvId) {
        commit("rejectCv", [cvId]);
      },
      startKpiPlanning(cycleId) {
        return commit("startKpiPlanning", [cycleId]).error;
      },
      startKpiMonitoring(cycleId) {
        return commit("startKpiMonitoring", [cycleId]).error;
      },
      setKpiYearCheckInFrequency(cycleId, cadence) {
        return commit("setKpiYearCheckInFrequency", [cycleId, cadence]).error;
      },
      setKpiPlanningEndDate(cycleId, planningEndsOn) {
        return commit("setKpiPlanningEndDate", [cycleId, planningEndsOn]).error;
      },
      closeKpiYear(cycleId) {
        return commit("closeKpiYear", [cycleId]).error;
      },
      openKpiAdjustmentWindow(cycleId) {
        return commit("openKpiAdjustmentWindow", [cycleId]).error;
      },
      closeKpiAdjustmentWindow(cycleId) {
        return commit("closeKpiAdjustmentWindow", [cycleId]).error;
      },
      createMissingKpiSets(cycleId) {
        return commit("createMissingKpiSets", [cycleId]).created;
      },
      upsertKpiItem(item) {
        return commit("upsertKpiItem", [item]).error;
      },
      removeKpiItem(id) {
        commit("removeKpiItem", [id]);
      },
      submitKpiSet(kpiSetId) {
        return commit("submitKpiSet", [kpiSetId]).error;
      },
      agreeKpiSet(kpiSetId) {
        return commit("agreeKpiSet", [kpiSetId]).error;
      },
      returnKpiSet(kpiSetId, comment) {
        commit("returnKpiSet", [kpiSetId, comment]);
      },
      grantAdmin(personId) {
        return commit("grantAdmin", [personId]).error;
      },
      revokeAdmin(personId) {
        return commit("revokeAdmin", [personId]).error;
      },
      addCheckIn(kpiItemId, actual, note) {
        return commit("addCheckIn", [kpiItemId, actual, note]).error;
      },
      agreeCheckIn(checkInId) {
        return commit("agreeCheckIn", [checkInId]).error;
      },
      returnCheckIn(checkInId, comment) {
        commit("returnCheckIn", [checkInId, comment]);
      },
      openProject(input) {
        return commit("openProject", [input]);
      },
      updateProject(projectId, input) {
        return commit("updateProject", [projectId, input]);
      },
      addStaffing(input) {
        return commit("addStaffing", [input]);
      },
      updateStaffing(staffingId, patch) {
        return commit("updateStaffing", [staffingId, patch]);
      },
      deleteStaffing(staffingId) {
        return commit("deleteStaffing", [staffingId]);
      },
      upsertWorkItem(input) {
        return commit("upsertWorkItem", [input]);
      },
      deleteWorkItem(workItemId) {
        return commit("deleteWorkItem", [workItemId]);
      },
      addDeliverable(input) {
        return commit("addDeliverable", [input]);
      },
      updateDeliverable(deliverableId, patch) {
        return commit("updateDeliverable", [deliverableId, patch]);
      },
      deleteDeliverable(deliverableId) {
        return commit("deleteDeliverable", [deliverableId]);
      },
      fileLeaveRequest(input) {
        return commit("fileLeaveRequest", [input]);
      },
      decideLeaveRequest(leaveRequestId, decision) {
        return commit("decideLeaveRequest", [leaveRequestId, decision]);
      },
      withdrawLeaveRequest(leaveRequestId) {
        return commit("withdrawLeaveRequest", [leaveRequestId]);
      },
      fileReimbursementRequest(input) {
        return commit("fileReimbursementRequest", [input]);
      },
      editReimbursementRequest(reimbursementRequestId, input) {
        return commit("editReimbursementRequest", [reimbursementRequestId, input]);
      },
      withdrawReimbursementRequest(reimbursementRequestId) {
        return commit("withdrawReimbursementRequest", [reimbursementRequestId]);
      },
      decideReimbursementRequest(reimbursementRequestId, input) {
        return commit("decideReimbursementRequest", [reimbursementRequestId, input]);
      },
      markReimbursementPaid(reimbursementRequestId, paidOn) {
        return commit("markReimbursementPaid", [reimbursementRequestId, paidOn]);
      },
      clearReimbursementPaid(reimbursementRequestId) {
        return commit("clearReimbursementPaid", [reimbursementRequestId]);
      },
      upsertTimeBlock(input) {
        return commit("upsertTimeBlock", [input]);
      },
      deleteTimeBlock(timeBlockId) {
        return commit("deleteTimeBlock", [timeBlockId]);
      },
      respondToInvite(inviteId, status) {
        return commit("respondToInvite", [inviteId, status]);
      },
      setWeekGrid(mode, personId) {
        return commit("setWeekGrid", [mode, personId]);
      },
      updatePersonContact(personId, patch) {
        return commit("updatePersonContact", [personId, patch]);
      },
      addDeliverableStatus(name) {
        return commit("addDeliverableStatus", [name]);
      },
      renameDeliverableStatus(statusId, name) {
        return commit("renameDeliverableStatus", [statusId, name]);
      },
      removeDeliverableStatus(statusId) {
        return commit("removeDeliverableStatus", [statusId]);
      },
      addDeliverableCategory(name) {
        return commit("addDeliverableCategory", [name]);
      },
      renameDeliverableCategory(categoryId, name) {
        return commit("renameDeliverableCategory", [categoryId, name]);
      },
      removeDeliverableCategory(categoryId) {
        return commit("removeDeliverableCategory", [categoryId]);
      },
      addLeaveType(name) {
        return commit("addLeaveType", [name]);
      },
      renameLeaveType(leaveTypeId, name) {
        return commit("renameLeaveType", [leaveTypeId, name]);
      },
      removeLeaveType(leaveTypeId) {
        return commit("removeLeaveType", [leaveTypeId]);
      },
      addPublicHoliday(date, name) {
        return commit("addPublicHoliday", [date, name]);
      },
      renamePublicHoliday(holidayId, name) {
        return commit("renamePublicHoliday", [holidayId, name]);
      },
      removePublicHoliday(holidayId) {
        return commit("removePublicHoliday", [holidayId]);
      },
      applyIndonesiaHolidayFeed(items) {
        return commit("applyIndonesiaHolidayFeed", [items]);
      },
      addTimeBlockType(name) {
        return commit("addTimeBlockType", [name]);
      },
      renameTimeBlockType(typeId, name) {
        return commit("renameTimeBlockType", [typeId, name]);
      },
      removeTimeBlockType(typeId) {
        return commit("removeTimeBlockType", [typeId]);
      },
    };
  }, [state, persisted, syncError]);

  if (!store) return <ShellSkeleton />;

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used within StoreProvider");
  return value;
}

export function useCurrentAssignment() {
  const { state } = useStore();
  return currentAssignment(state, state.currentPersonId);
}

export { roleLabel };

/** Shown while the tenant loads: the shell's shape, so nothing jumps when the real page arrives. */
function ShellSkeleton() {
  const bar = "rounded-full bg-[color-mix(in_srgb,var(--line)_70%,var(--paper))] motion-safe:animate-pulse";
  return (
    <div className="flex h-dvh flex-col bg-bg" role="status" aria-live="polite">
      <span className="sr-only">Loading KMPlus People…</span>
      <div className="h-[68px] shrink-0 border-b-[1.5px] border-line bg-paper" aria-hidden />
      <div className="flex min-h-0 flex-1" aria-hidden>
        <div className="hidden w-[var(--sidebar-width-expanded)] shrink-0 flex-col gap-3 border-r-[1.5px] border-line bg-paper px-4 py-5 md:flex">
          {[70, 55, 80, 60, 50, 75, 65].map((width, index) => (
            <span key={index} className={`h-4 ${bar}`} style={{ width: `${width}%` }} />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
          <span className={`h-7 w-48 ${bar}`} />
          <span className={`h-4 w-80 max-w-full ${bar}`} />
          <div className="mt-4 h-64 rounded-2xl bg-paper shadow-[var(--shadow)]" />
        </div>
      </div>
    </div>
  );
}
