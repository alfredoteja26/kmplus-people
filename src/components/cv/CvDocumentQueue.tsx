"use client";

import { Callout, Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import type { CurriculumVitae } from "@/lib/types";

export function CvDocumentQueue({
  cvs,
  selectedId,
  onSelect,
  emptyMessage,
}: {
  cvs: CurriculumVitae[];
  selectedId: string;
  onSelect: (id: string) => void;
  emptyMessage: string;
}) {
  return (
    <Card className="!p-0">
      <div className="border-b border-line px-4 py-3">
        <p className="m-0 text-[12px] font-medium uppercase tracking-[0.06em] text-faint">Document queue</p>
        <p className="mt-0.5 mb-0 text-sm text-muted">{cvs.length === 1 ? "1 document" : `${cvs.length} documents`}</p>
      </div>
      {cvs.length === 0 ? (
        <div className="p-4">
          <Callout>{emptyMessage}</Callout>
        </div>
      ) : (
        <div className="max-h-[min(70vh,640px)] overflow-x-auto overflow-y-auto [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
          <Table>
            <thead>
              <tr>
                <Th>File</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {cvs.map((cv) => {
                const selected = cv.id === selectedId;
                return (
                  <tr key={cv.id} className={selected ? "bg-tint" : undefined}>
                    <Td>
                      <button
                        type="button"
                        aria-current={selected ? "true" : undefined}
                        className="border-0 bg-transparent p-0 text-left text-sm font-medium text-accent underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        onClick={() => onSelect(cv.id)}
                      >
                        {cv.fileName}
                      </button>
                    </Td>
                    <Td>
                      <StatusBadge status={cv.state} />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
