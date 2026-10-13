import type { Health } from "@/lib/types";
import { Badge } from "@/components/product/Badge";
import { statusLabel } from "@/lib/labels";

export function HealthBadge({ health }: { health: Health }) {
  if (health === "on-track") return <Badge tone="success">On track</Badge>;
  if (health === "at-risk") return <Badge tone="warning">At risk</Badge>;
  if (health === "off") return <Badge tone="danger">Off track</Badge>;
  return <Badge>No check-in</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const label = statusLabel(status);
  if (["active", "agreed", "approved", "applied", "accepted", "scored"].includes(status)) {
    return <Badge tone="success">{label}</Badge>;
  }
  if (["in-review", "pending", "parsed", "draft-hire"].includes(status)) {
    return <Badge tone="accent">{label}</Badge>;
  }
  if (status === "returned" || status === "at-risk") return <Badge tone="warning">{label}</Badge>;
  if (status === "rejected" || status === "off") return <Badge tone="danger">{label}</Badge>;
  return <Badge>{label}</Badge>;
}
