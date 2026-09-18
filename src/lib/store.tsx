"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as commands from "./commands";
import type { ApplyCvMode, CreatePersonInput } from "./commands";
import { currentAssignment, roleLabel } from "./domain";
import { createInitialState } from "./fixtures";
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
  openCycle: (cycleId: string) => void;
  setCycleCadence: (cycleId: string, cadence: import("./types").CheckInCadence) => void;
  closeCycle: (cycleId: string) => void;
  createMissingKpiSets: (cycleId: string) => number;
  upsertKpiItem: (item: Omit<KpiItem, "tenantId" | "id"> & { id?: string }) => string | null;
  removeKpiItem: (id: string) => void;
  submitKpiSet: (kpiSetId: string) => string | null;
  agreeKpiSet: (kpiSetId: string) => string | null;
  returnKpiSet: (kpiSetId: string, comment: string) => void;
  addCheckIn: (kpiItemId: string, actual: number, note: string) => void;
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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tenant-state")
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = "/login";
          throw new Error("unauthorized");
        }
        if (!response.ok) throw new Error("unavailable");
        return (await response.json()) as AppState;
      })
      .then((loaded) => {
        if (cancelled) return;
        setState(loaded);
        setPersisted(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof Error && error.message === "unauthorized") return;
        setState(createInitialState());
        setPersisted(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const store = useMemo<Store | null>(() => {
    if (!state) return null;
    const current = state;

    function persist(next: AppState) {
      if (!persisted) return;
      void putTenantState(next).catch(() => setPersisted(false));
    }

    function commit<T extends { state: AppState }>(run: (prev: AppState) => T): Omit<T, "state"> {
      const { state: next, ...rest } = run(current);
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
      openCycle(cycleId) {
        commit((prev) => commands.openKpiCycle(prev, cycleId));
      },
      setCycleCadence(cycleId, cadence) {
        commit((prev) => commands.setCycleCadence(prev, cycleId, cadence));
      },
      closeCycle(cycleId) {
        commit((prev) => commands.closeCycle(prev, cycleId));
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
      addCheckIn(kpiItemId, actual, note) {
        commit((prev) => commands.addCheckIn(prev, kpiItemId, actual, note));
      },
    };
  }, [state, persisted]);

  if (!store) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted">
        Loading People…
      </div>
    );
  }

  return (
    <StoreContext.Provider value={store}>
      {!store.persisted ? (
        <p className="m-0 border-b-[1.5px] border-line bg-[color-mix(in_srgb,var(--warning)_12%,var(--paper))] px-4 py-2 text-sm">
          Postgres is offline. Changes last until refresh.
        </p>
      ) : null}
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
