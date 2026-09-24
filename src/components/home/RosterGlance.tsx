"use client";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, Td, Th } from "@/components/ui/Table";
import { activePeopleCount, currentAssignment, personById, positionById } from "@/lib/domain";
import type { AppState } from "@/lib/types";
import Link from "next/link";

export function RosterGlance({ state }: { state: AppState }) {
  const rows = state.employments
    .filter((row) => row.status === "active")
    .map((employment) => {
      const person = personById(state, employment.personId);
      if (!person) return null;
      const assignment = currentAssignment(state, person.id);
      const position = assignment ? positionById(state, assignment.positionId) : undefined;
      const orgUnit = position
        ? state.orgUnits.find((unit) => unit.id === position.orgUnitId)
        : undefined;
      return { person, position, orgUnit };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => a.person.legalName.localeCompare(b.person.legalName));

  return (
    <section className="mb-8" aria-labelledby="home-roster">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="home-roster" className="m-0 text-[22px] font-medium">
          Roster glance
        </h2>
        <Badge tone="neutral">{activePeopleCount(state)} active</Badge>
        <Link href="/people" className="ml-auto text-sm font-medium text-accent no-underline hover:underline">
          Full People list
        </Link>
      </div>
      <Card className="p-0 shadow-none">
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Position</Th>
              <Th>Organization</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ person, position, orgUnit }) => (
              <tr key={person.id} className="transition-colors hover:bg-tint focus-within:bg-tint">
                <Td>
                  <Link href={`/people/${person.id}`} className="font-medium text-accent no-underline hover:underline">
                    {person.legalName}
                  </Link>
                </Td>
                  <Td>{position?.title ?? "No current seat"}</Td>
                <Td>{orgUnit?.name ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
