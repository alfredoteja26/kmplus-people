"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as commands from "./commands";
import type { ApplyCvMode, CreatePersonInput } from "./commands";
import { currentAssignment, roleLabel } from "./domain";
import { createInitialState } from "./fixtures";
import { overlaySessionIdentity } from "./session-identity";
import type { Role } from "./types";
import type { AppState, CurriculumVitae, FieldDecision, KpiItem, Person, Position } from "./types";

type Store = {
  state: AppState;
  persisted: boolean;
  createPerson: (input: CreatePersonInput) => string;
  updatePerson: (personId: string, patch: Partial<Person>) => void;
  confirmHire: (personId: string) => void;
  assignPosition: (personId: string, positionId: string, startDate: string) => void;
  createPosition: (input: Omit<Position, "id" | "tenantId">) => string;
  updatePosition: (positionId: string, patch: Partial<Omit<Position, "id" | "tenantId">>) => void;
  requestCorrection: (personId: string, field: string, currentValue: string, proposedValue: string) => void;
  resolveCorrection: (id: string, status: "accepted" | "rejected") => void;
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
  upsertWorkItem: (input: commands.UpsertWorkItemInput) => { workItemId: string | null; error: string | null };
  addDeliverable: (input: commands.AddDeliverableInput) => { deliverableId: string | null; error: string | null };
  updateDeliverable: (
    deliverableId: string,
    patch: Parameters<typeof commands.updateDeliverable>[2],
  ) => { error: string | null };
  deleteDeliverable: (deliverableId: string) => { error: string | null };
  fileLeaveRequest: (input: commands.FileLeaveInput) => { leaveRequestId: string | null; error: string | null };
  decideLeaveRequest: (leaveRequestId: string, decision: import("./types").LeaveDecision) => { error: string | null };
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

async function putTenantState(state: AppState) {
  const response = await fetch("/api/tenant-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
  if (!response.ok) {
    throw new Error("Could not save tenant state");
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [persisted, setPersisted] = useState(false);
  /** Latest committed state, updated synchronously so two commits in one tick build on each other. */
  const latest = useRef<AppState | null>(null);
  /** Saves run one after another so an older snapshot never lands after a newer one. */
  const saving = useRef<Promise<void>>(Promise.resolve());

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

    function persist(next: AppState) {
      if (!persisted) return;
      saving.current = saving.current
        .then(() => putTenantState(next))
        .catch(() => setPersisted(false));
    }

    function commit<T extends { state: AppState }>(run: (prev: AppState) => T): Omit<T, "state"> {
      const { state: next, ...rest } = run(latest.current ?? current);
      latest.current = next;
      setState(next);
      persist(next);
      return rest as Omit<T, "state">;
    }

    return {
      state: current,
      persisted,
      createPerson(input) {
        return commit((prev) => commands.createPerson(prev, input)).personId;
      },
      updatePerson(personId, patch) {
        commit((prev) => commands.updatePerson(prev, personId, patch));
      },
      confirmHire(personId) {
        commit((prev) => commands.confirmHire(prev, personId));
      },
      assignPosition(personId, positionId, startDate) {
        commit((prev) => commands.assignPosition(prev, personId, positionId, startDate));
      },
      createPosition(input) {
        return commit((prev) => commands.createPosition(prev, input)).positionId;
      },
      updatePosition(positionId, patch) {
        commit((prev) => commands.updatePosition(prev, positionId, patch));
      },
      requestCorrection(personId, field, currentValue, proposedValue) {
        commit((prev) => commands.requestCorrection(prev, personId, field, currentValue, proposedValue));
      },
      resolveCorrection(id, status) {
        commit((prev) => commands.resolveCorrection(prev, id, status));
      },
      addCv(cv) {
        return commit((prev) => commands.addCv(prev, cv)).cvId;
      },
      decideCvField(cvId, key, decision, editedValue) {
        commit((prev) => commands.decideCvField(prev, cvId, key, decision, editedValue));
      },
      applyCv(cvId, mode) {
        const { personId } = commit((prev) => commands.applyCv(prev, cvId, mode));
        return mode.type === "new-hire" ? personId : null;
      },
      rejectCv(cvId) {
        commit((prev) => commands.rejectCv(prev, cvId));
      },
      startKpiPlanning(cycleId) {
        return commit((prev) => commands.startKpiPlanning(prev, cycleId)).error;
      },
      startKpiMonitoring(cycleId) {
        return commit((prev) => commands.startKpiMonitoring(prev, cycleId)).error;
      },
      setKpiYearCheckInFrequency(cycleId, cadence) {
        return commit((prev) => commands.setKpiYearCheckInFrequency(prev, cycleId, cadence)).error;
      },
      setKpiPlanningEndDate(cycleId, planningEndsOn) {
        return commit((prev) => commands.setKpiPlanningEndDate(prev, cycleId, planningEndsOn)).error;
      },
      closeKpiYear(cycleId) {
        return commit((prev) => commands.closeKpiYear(prev, cycleId)).error;
      },
      openKpiAdjustmentWindow(cycleId) {
        return commit((prev) => commands.openKpiAdjustmentWindow(prev, cycleId)).error;
      },
      closeKpiAdjustmentWindow(cycleId) {
        return commit((prev) => commands.closeKpiAdjustmentWindow(prev, cycleId)).error;
      },
      createMissingKpiSets(cycleId) {
        return commit((prev) => commands.createMissingKpiSets(prev, cycleId)).created;
      },
      upsertKpiItem(item) {
        return commit((prev) => commands.upsertKpiItem(prev, item)).error;
      },
      removeKpiItem(id) {
        commit((prev) => commands.removeKpiItem(prev, id));
      },
      submitKpiSet(kpiSetId) {
        return commit((prev) => commands.submitKpiSet(prev, kpiSetId)).error;
      },
      agreeKpiSet(kpiSetId) {
        return commit((prev) => commands.agreeKpiSet(prev, kpiSetId)).error;
      },
      returnKpiSet(kpiSetId, comment) {
        commit((prev) => commands.returnKpiSet(prev, kpiSetId, comment));
      },
      grantAdmin(personId) {
        return commit((prev) => commands.grantAdmin(prev, personId)).error;
      },
      revokeAdmin(personId) {
        return commit((prev) => commands.revokeAdmin(prev, personId)).error;
      },
      addCheckIn(kpiItemId, actual, note) {
        return commit((prev) => commands.addCheckIn(prev, kpiItemId, actual, note)).error;
      },
      agreeCheckIn(checkInId) {
        return commit((prev) => commands.agreeCheckIn(prev, checkInId)).error;
      },
      returnCheckIn(checkInId, comment) {
        commit((prev) => commands.returnCheckIn(prev, checkInId, comment));
      },
      openProject(input) {
        return commit((prev) => commands.openProject(prev, input));
      },
      updateProject(projectId, input) {
        return commit((prev) => commands.updateProject(prev, projectId, input));
      },
      addStaffing(input) {
        return commit((prev) => commands.addStaffing(prev, input));
      },
      upsertWorkItem(input) {
        return commit((prev) => commands.upsertWorkItem(prev, input));
      },
      addDeliverable(input) {
        return commit((prev) => commands.addDeliverable(prev, input));
      },
      updateDeliverable(deliverableId, patch) {
        return commit((prev) => commands.updateDeliverable(prev, deliverableId, patch));
      },
      deleteDeliverable(deliverableId) {
        return commit((prev) => commands.deleteDeliverable(prev, deliverableId));
      },
      fileLeaveRequest(input) {
        return commit((prev) => commands.fileLeaveRequest(prev, input));
      },
      decideLeaveRequest(leaveRequestId, decision) {
        return commit((prev) => commands.decideLeaveRequest(prev, leaveRequestId, decision));
      },
      upsertTimeBlock(input) {
        return commit((prev) => commands.upsertTimeBlock(prev, input));
      },
      deleteTimeBlock(timeBlockId) {
        return commit((prev) => commands.deleteTimeBlock(prev, timeBlockId));
      },
      respondToInvite(inviteId, status) {
        return commit((prev) => commands.respondToInvite(prev, inviteId, status));
      },
      setWeekGrid(mode, personId) {
        return commit((prev) => commands.setWeekGrid(prev, mode, personId));
      },
      updatePersonContact(personId, patch) {
        return commit((prev) => commands.updatePersonContact(prev, personId, patch));
      },
      addDeliverableStatus(name) {
        return commit((prev) => commands.addDeliverableStatus(prev, name));
      },
      renameDeliverableStatus(statusId, name) {
        return commit((prev) => commands.renameDeliverableStatus(prev, statusId, name));
      },
      removeDeliverableStatus(statusId) {
        return commit((prev) => commands.removeDeliverableStatus(prev, statusId));
      },
      addDeliverableCategory(name) {
        return commit((prev) => commands.addDeliverableCategory(prev, name));
      },
      renameDeliverableCategory(categoryId, name) {
        return commit((prev) => commands.renameDeliverableCategory(prev, categoryId, name));
      },
      removeDeliverableCategory(categoryId) {
        return commit((prev) => commands.removeDeliverableCategory(prev, categoryId));
      },
      addLeaveType(name) {
        return commit((prev) => commands.addLeaveType(prev, name));
      },
      renameLeaveType(leaveTypeId, name) {
        return commit((prev) => commands.renameLeaveType(prev, leaveTypeId, name));
      },
      removeLeaveType(leaveTypeId) {
        return commit((prev) => commands.removeLeaveType(prev, leaveTypeId));
      },
      addPublicHoliday(date, name) {
        return commit((prev) => commands.addPublicHoliday(prev, date, name));
      },
      renamePublicHoliday(holidayId, name) {
        return commit((prev) => commands.renamePublicHoliday(prev, holidayId, name));
      },
      removePublicHoliday(holidayId) {
        return commit((prev) => commands.removePublicHoliday(prev, holidayId));
      },
      applyIndonesiaHolidayFeed(items) {
        return commit((prev) => commands.applyIndonesiaHolidayFeed(prev, items));
      },
      addTimeBlockType(name) {
        return commit((prev) => commands.addTimeBlockType(prev, name));
      },
      renameTimeBlockType(typeId, name) {
        return commit((prev) => commands.renameTimeBlockType(prev, typeId, name));
      },
      removeTimeBlockType(typeId) {
        return commit((prev) => commands.removeTimeBlockType(prev, typeId));
      },
    };
  }, [state, persisted]);

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
