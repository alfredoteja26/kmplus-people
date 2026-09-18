"use client";

import { personById } from "@/lib/domain";
import type { AppState } from "@/lib/types";
import { Table, Td, Th } from "@/components/ui/Table";

export function AuditSlice({ state }: { state: AppState }) {
  const rows = state.audit.slice(0, 8);

  return (
    <section className="mt-10" aria-labelledby="home-audit">
      <h2 id="home-audit" className="mb-2 text-[18px] font-medium text-muted">
        Recent audit
      </h2>
      <p className="mt-0 mb-3 text-sm text-muted">Last eight changes in this Tenant. Work queues above stay primary.</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No audit entries yet.</p>
      ) : (
        <div className="opacity-95 [&_table]:text-[13px]">
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <Td className="font-mono text-xs text-faint">{row.at.slice(0, 19).replace("T", " ")}</Td>
                  <Td>{personById(state, row.actorPersonId)?.preferredName ?? "—"}</Td>
                  <Td className="text-muted">
                    {row.action} {row.entity}
                  </Td>
                  <Td className="text-muted">{row.detail}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </section>
  );
}
