import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[12px] border-[1.5px] border-line bg-paper">
      <table className="w-full border-collapse">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={`border-b border-line px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.06em] text-faint ${className ?? ""}`}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-line px-3 py-2.5 text-[13px] ${className ?? ""}`}>{children}</td>;
}
