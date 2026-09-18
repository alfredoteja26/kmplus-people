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
      if (kpiSet.status === "agreed" || kpiSet.status === "active") {
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
            {cycle && kpiHasGaps ? "KpiSet gaps or CheckIns off track" : null}
          </p>
        )}
      </div>

      {allClear ? (
        <Callout>
          Every Position has a current Assignment and the Curriculum Vitae queue is clear.
          {cycle
            ? " Agreed and active KpiSets in the open KpiCycle look healthy."
            : " Open a KpiCycle when you are ready to plan KpiSets and CheckIns."}{" "}
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
          <p className="m-0 text-sm text-muted">Every Position has a current Assignment.</p>
        ) : (
          <>
            <p className="mt-0 mb-3 text-sm text-muted">
              Assign a Person to these Positions in Organization.
            </p>
            <Table>
              <thead>
                <tr>
                  <Th>Position</Th>
                  <Th>OrgUnit</Th>
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
              Accept, edit, or reject parsed fields before they write to Person.
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
            KpiCycle and KpiSets
          </h3>
          {cycle ? (
            <Badge tone={kpiHasGaps ? "warning" : "success"}>{cycle.name}</Badge>
          ) : (
            <Badge tone="neutral">No open cycle</Badge>
          )}
        </div>
        {!cycle ? (
          <p className="m-0 text-sm text-muted">
            No open KpiCycle, so on-track CheckIns are not counted.{" "}
            <Link href="/kpi/cycle" className="font-medium text-accent no-underline hover:underline">
              Open KPI cycle admin
            </Link>{" "}
            when planning or scoring starts.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            {missingKpiSets > 0 ? (
              <p className="m-0 text-muted">
                <span className="font-medium text-ink">{missingKpiSets}</span>
                {missingKpiSets === 1 ? " current Assignment has" : " current Assignments have"} no KpiSet for {cycle.name}.{" "}
                <Link href="/kpi/cycle" className="font-medium text-accent no-underline hover:underline">
                  Draft missing KpiSets
                </Link>
              </p>
            ) : (
              <p className="m-0 text-muted">Every current Assignment has a KpiSet for {cycle.name}.</p>
            )}
            {draftOrReturned > 0 ? (
              <p className="m-0 text-muted">
                <span className="font-medium text-ink">{draftOrReturned}</span>
                {draftOrReturned === 1 ? " KpiSet needs" : " KpiSets need"} agreement or return resolution.{" "}
                <Link href="/kpi/cycle" className="font-medium text-accent no-underline hover:underline">
                  Review in KPI cycle admin
                </Link>
              </p>
            ) : null}
            <p className="m-0">
              <span className="font-medium text-ink">{onTrack}</span>
              {onTrack === 1 ? " agreed or active KpiSet is" : " agreed or active KpiSets are"} on track (CheckIns healthy)
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
                {offTrack} KpiSet{offTrack === 1 ? " has" : "s have"} at-risk or off CheckIns — follow up in Team or
                cycle admin.
              </p>
            ) : agreedActive > 0 && missingKpiSets === 0 && draftOrReturned === 0 ? (
              <p className="m-0 text-muted">CheckIns for agreed and active KpiSets look healthy.</p>
            ) : null}
          </div>
        )}
      </section>
    </Card>
  );
}
