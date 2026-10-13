import type { ComponentProps, ReactNode } from "react";
import { Table as CossTable, TableCell, TableHead } from "@/components/coss/table";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <CossTable>{children}</CossTable>
    </div>
  );
}

export function Th(props: ComponentProps<typeof TableHead>) {
  return <TableHead {...props} />;
}

export function Td(props: ComponentProps<typeof TableCell>) {
  return <TableCell {...props} />;
}
