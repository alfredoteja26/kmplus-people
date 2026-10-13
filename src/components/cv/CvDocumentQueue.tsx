"use client";

import { Callout, Card } from "@/components/product/Card";
import { StatusBadge } from "@/components/product/StatusBadge";
import { Table, Td, Th } from "@/components/product/Table";
import { plural } from "@/lib/labels";
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
        <h2 className="m-0 text-sm font-medium">CVs</h2>
        <p className="mt-0.5 mb-0 text-sm text-muted">{plural(cvs.length, "CV")}</p>
      </div>
      {cvs.length === 0 ? (
        <div className="p-4">
          <Callout>{emptyMessage}</Callout>
        </div>
      ) : (
        <div className="max-h-[min(70vh,640px)] overflow-y-auto [&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none">
          <Table>
            <thead>
              <tr>
                <Th>File</Th>
                <Th className="w-px text-right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {cvs.map((cv) => {
                const selected = cv.id === selectedId;
                return (
                  <tr key={cv.id} className={selected ? "bg-tint" : undefined}>
                    <Td className="whitespace-normal">
                      <button
                        type="button"
                        aria-current={selected ? "true" : undefined}
                        className="border-0 bg-transparent p-0 text-left text-sm font-medium leading-snug [overflow-wrap:anywhere] text-accent underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        onClick={() => onSelect(cv.id)}
                      >
                        {cv.fileName}
                      </button>
                    </Td>
                    <Td className="w-px text-right">
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
