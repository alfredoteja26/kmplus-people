"use client";

import { Callout, Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import {
  cvsInReviewCount,
  emptySeats,
  kpiOnTrackCount,
  kpiSetForAssignment,
  openCycle,
  setHealth,
} from "@/lib/domain";
import type { AppState, CurriculumVitae } from "@/lib/types";
import Link from "next/link";

function cvLabel(cv: CurriculumVitae) {
  const name = cv.fields.find((field) => field.key === "name")?.value?.trim();
  if (name) return name;
  if (cv.personId) return cv.fileName;
  return cv.fileName;
}

function interactiveRowClass() {
  return "transition-colors hover:bg-tint focus-within:bg-tint";
}

export function NeedsAttention({ state }: { state: AppState }) {
  const empty = emptySeats(state);
  const cvQueue = state.cvs.filter((row) => row.state === "in-review" || row.state === "parsed");
  const cycle = openCycle(state);

  let missingKpiSets = 0;
  let draftOrReturned = 0;
  let agreedActive = 0;
  let offTrack = 0;

  if (cycle) {
    const activeAssignments = state.assignments.filter((row) => row.endDate === null);
    for (const assignment of activeAssignments) {
      const kpiSet = kpiSetForAssignment(state, assignment.id, cycle.id);
      if (!kpiSet) {
        missingKpiSets += 1;
        continue;
      }
      if (kpiSet.status === "draft" || kpiSet.status === "returned") {
        draftOrReturned += 1;
      }
      if (kpiSet.status === "approved") {
        agreedActive += 1;
        const health = setHealth(state, kpiSet);
        if (health === "off" || health === "at-risk") offTrack += 1;
      }
    }
  }

  const onTrack = cycle ? kpiOnTrackCount(state) : 0;
  const kpiHasGaps =
    Boolean(cycle) && (missingKpiSets > 0 || draftOrReturned > 0 || offTrack > 0);
  const allClear = empty.length === 0 && cvQueue.length === 0 && !kpiHasGaps;

  return (
    <Card className="mb-8">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-[22px] font-medium">Needs attention</h2>
        {allClear ? (
          <Badge tone="success">Caught up</Badge>
        ) : (
          <p className="m-0 text-sm text-muted">
            {empty.length > 0 ? `${empty.length} empty seat${empty.length === 1 ? "" : "s"}` : null}
            {empty.length > 0 && cvQueue.length > 0 ? " · " : null}
            {cvQueue.length > 0
              ? `${cvsInReviewCount(state)} Curriculum Vitae in review`
              : null}
            {cycle && (empty.length > 0 || cvQueue.length > 0) && kpiHasGaps ? " · " : null}
            {cycle && kpiHasGaps ? "KPI portfolio gaps or check-ins off track" : null}
          </p>
        )}
      </div>

      {allClear ? (
        <Callout>
          Every position has someone in the seat and the curriculum vitae queue is clear.
          {cycle
            ? " Agreed and active KPI portfolios in the active KPI year look healthy."
            : " Start planning on KPI Admin when you are ready to plan KPI portfolios."}{" "}
          Use roster glance below or jump to People, Organization, or Performance when something new arrives.
        </Callout>
      ) : null}

      <section className="mb-6 last:mb-0" aria-labelledby="home-empty-seats">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 id="home-empty-seats" className="m-0 text-[16px] font-medium">
            Empty seats
          </h3>
          <Badge tone={empty.length ? "warning" : "success"}>{empty.length}</Badge>
        </div>
        {empty.length === 0 ? (
          <p className="m-0 text-sm text-muted">Every position has someone in the seat.</p>
        ) : (
          <>
            <p className="mt-0 mb-3 text-sm text-muted">
              Assign someone to these positions in Organization.
            </p>
            <Table>
              <thead>
                <tr>
                  <Th>Position</Th>
                  <Th>Organization</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {empty.map((position) => (
                  <tr key={position.id} className={interactiveRowClass()}>
                    <Td>{position.title}</Td>
                    <Td>{state.orgUnits.find((unit) => unit.id === position.orgUnitId)?.name ?? "—"}</Td>
                    <Td>
                      <Link href="/org" className="font-medium text-accent no-underline hover:underline">
                        Open Organization
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </section>

      <section className="mb-6 last:mb-0" aria-labelledby="home-cv-queue">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 id="home-cv-queue" className="m-0 text-[16px] font-medium">
            CVs in review
          </h3>
          <Badge tone={cvQueue.length ? "accent" : "success"}>{cvQueue.length}</Badge>
        </div>
        {cvQueue.length === 0 ? (
          <p className="m-0 text-sm text-muted">No Curriculum Vitae waiting on HR review.</p>
        ) : (
          <>
            <p className="mt-0 mb-3 text-sm text-muted">
              Accept, edit, or reject parsed fields before they write to the person.
            </p>
            <Table>
              <thead>
                <tr>
                  <Th>Source</Th>
                  <Th>Review state</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {cvQueue
                  .slice()
                  .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))
                  .map((cv) => (
                    <tr key={cv.id} className={interactiveRowClass()}>
                      <Td>
                        <span className="block font-medium">{cvLabel(cv)}</span>
                        <span className="text-xs text-muted">{cv.fileName}</span>
                      </Td>
                      <Td>
                        <StatusBadge status={cv.state} />
                      </Td>
                      <Td>
                        <Link href="/cv" className="font-medium text-accent no-underline hover:underline">
                          Review Curriculum Vitae
                        </Link>
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </>
        )}
      </section>

      <section aria-labelledby="home-kpi-cycle">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 id="home-kpi-cycle" className="m-0 text-[16px] font-medium">
            KPI year and portfolios
          </h3>
          {cycle ? (
            <Badge tone={kpiHasGaps ? "warning" : "success"}>{cycle.name}</Badge>
          ) : (
            <Badge tone="neutral">No active KPI year</Badge>
          )}
        </div>
        {!cycle ? (
          <p className="m-0 text-sm text-muted">
            No KPI year is in planning or monitoring, so on-track check-ins are not counted.{" "}
            <Link href="/kpi/cycle" className="font-medium text-accent no-underline hover:underline">
              Open KPI Admin
            </Link>{" "}
            when planning or monitoring starts.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            {missingKpiSets > 0 ? (
              <p className="m-0 text-muted">
                <span className="font-medium text-ink">{missingKpiSets}</span>
                {missingKpiSets === 1 ? " current assignment has" : " current assignments have"} no KPI portfolio for {cycle.name}.{" "}
                <Link href="/kpi/cycle" className="font-medium text-accent no-underline hover:underline">
                  Draft missing KPI portfolios
                </Link>
              </p>
            ) : (
              <p className="m-0 text-muted">Every current assignment has a KPI portfolio for {cycle.name}.</p>
            )}
            {draftOrReturned > 0 ? (
              <p className="m-0 text-muted">
                <span className="font-medium text-ink">{draftOrReturned}</span>
                {draftOrReturned === 1 ? " KPI portfolio needs" : " KPI portfolios need"} agreement or a return.{" "}
                <Link href="/kpi/cycle" className="font-medium text-accent no-underline hover:underline">
                  Review in KPI Admin
                </Link>
              </p>
            ) : null}
            <p className="m-0">
              <span className="font-medium text-ink">{onTrack}</span>
              {onTrack === 1 ? " agreed or active KPI portfolio is" : " agreed or active KPI portfolios are"} on track (check-ins look healthy)
              {agreedActive > 0 ? (
                <>
                  {" "}
                  of <span className="font-medium text-ink">{agreedActive}</span> in that state
                </>
              ) : null}
              .{" "}
              <Link href="/kpi" className="font-medium text-accent no-underline hover:underline">
                Open My KPI
              </Link>
            </p>
            {offTrack > 0 ? (
              <p className="m-0 text-muted">
                {offTrack} KPI portfolio{offTrack === 1 ? " has" : "s have"} at-risk or off-track check-ins. Follow up in Team or
                KPI Admin.
              </p>
            ) : agreedActive > 0 && missingKpiSets === 0 && draftOrReturned === 0 ? (
              <p className="m-0 text-muted">Check-ins for agreed and active KPI portfolios look healthy.</p>
            ) : null}
          </div>
        )}
      </section>
    </Card>
  );
}
