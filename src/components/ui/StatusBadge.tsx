import type { Health } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

export function HealthBadge({ health }: { health: Health }) {
  if (health === "on-track") return <Badge tone="success">On track</Badge>;
  if (health === "at-risk") return <Badge tone="warning">At risk</Badge>;
  if (health === "off") return <Badge tone="danger">Off</Badge>;
  return <Badge>No CheckIn</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "active" || status === "agreed" || status === "applied" || status === "accepted") {
    return <Badge tone="success">{status}</Badge>;
  }
  if (status === "in-review" || status === "parsed" || status === "draft-hire") {
    return <Badge tone="accent">{status}</Badge>;
  }
  if (status === "returned" || status === "at-risk") return <Badge tone="warning">{status}</Badge>;
  if (status === "rejected" || status === "resigned" || status === "off" || status === "closed") {
    return <Badge tone="danger">{status}</Badge>;
  }
  return <Badge>{status}</Badge>;
}
