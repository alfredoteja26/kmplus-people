"use client";

import { Button } from "@/components/coss/button";
import { Checkbox } from "@/components/coss/checkbox";
import { CheckboxGroup } from "@/components/coss/checkbox-group";
import { Fieldset, FieldsetLegend } from "@/components/coss/fieldset";
import { Input } from "@/components/coss/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { Badge } from "@/components/product/Badge";
import { Callout } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { Select } from "@/components/product/Select";
import { storedFileHref } from "@/lib/file-access";
import { formatDate, plural } from "@/lib/labels";
import { statusTone } from "@/lib/project-view";
import type { AppState, Deliverable, DeliverableKind, Project } from "@/lib/types";
import { uploadWorkDeliveryFile } from "@/lib/upload-work-delivery";
import { defaultDeliverableStatusId } from "@/lib/work-delivery-query";
import { ExternalLinkIcon, FileIcon } from "lucide-react";
import { useState } from "react";
import { plainProjectError } from "./errors";

export type NewDeliverableInput = {
  kind: DeliverableKind;
  name: string;
  categoryId: string;
  statusId: string;
  url?: string;
  storagePath?: string;
  fileName?: string;
  workItemIds: string[];
};

export type DeliverablePatch = {
  name?: string;
  statusId?: string;
  categoryId?: string;
  url?: string;
  storagePath?: string;
  fileName?: string;
  workItemIds?: string[];
};

export function DeliverableSheet({
  state,
  project,
  deliverable,
  canEdit,
  presetWorkItemId,
  onClose,
  onAdd,
  onUpdate,
  onDelete,
}: {
  state: AppState;
  project: Project;
  deliverable?: Deliverable;
  canEdit: boolean;
  presetWorkItemId?: string;
  onClose: () => void;
  onAdd: (input: NewDeliverableInput) => string | null;
  onUpdate: (id: string, patch: DeliverablePatch) => string | null;
  onDelete: (id: string) => string | null;
}) {
  const statuses = [...state.deliverableStatuses].sort((a, b) => a.sortOrder - b.sortOrder);
  const categories = [...state.deliverableCategories].sort((a, b) => a.sortOrder - b.sortOrder);
  const workItems = state.workItems.filter((row) => row.projectId === project.id);

  const [kind, setKind] = useState<DeliverableKind>(deliverable?.kind ?? "link");
  const [name, setName] = useState(deliverable?.name ?? "");
  const [url, setUrl] = useState(deliverable?.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [statusId, setStatusId] = useState(deliverable?.statusId ?? defaultDeliverableStatusId(state) ?? statuses[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(deliverable?.categoryId ?? categories[0]?.id ?? "");
  const [workItemIds, setWorkItemIds] = useState<string[]>(deliverable?.workItemIds ?? (presetWorkItemId ? [presetWorkItemId] : []));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const versions = [...(deliverable?.versions ?? [])].reverse();
  const status = state.deliverableStatuses.find((row) => row.id === deliverable?.statusId);
  const category = state.deliverableCategories.find((row) => row.id === deliverable?.categoryId);

  if (deliverable && !canEdit) {
    return (
      <FormSheet title={deliverable.name} description={category?.name} onClose={onClose}>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(status)}>{status?.name ?? "No status"}</Badge>
          <span className="text-sm text-muted">{deliverable.kind === "link" ? "Link" : plural(deliverable.versions.length, "version")}</span>
        </div>
        <DeliverableOpen deliverable={deliverable} />
        <p className="m-0 text-sm text-muted">Only an Admin or someone on this project today can change deliverables.</p>
      </FormSheet>
    );
  }

  async function save() {
    setError("");
    let uploaded: { storagePath: string; fileName: string } | null = null;
    if (kind === "file" && file) {
      setUploading(true);
      const result = await uploadWorkDeliveryFile(file, "deliverable");
      setUploading(false);
      if (result.error || !result.storagePath) {
        setError(result.error || "The file could not be uploaded. Try again.");
        return;
      }
      uploaded = result;
    }
    const message = deliverable
      ? onUpdate(deliverable.id, {
          name: name.trim(),
          statusId,
          categoryId,
          workItemIds,
          ...(deliverable.kind === "link" ? { url: url.trim() } : {}),
          ...(uploaded ? { storagePath: uploaded.storagePath, fileName: uploaded.fileName } : {}),
        })
      : onAdd({
          kind,
          name: name.trim() || uploaded?.fileName || "",
          categoryId,
          statusId,
          workItemIds,
          ...(kind === "link" ? { url: url.trim() } : {}),
          ...(uploaded ? { storagePath: uploaded.storagePath, fileName: uploaded.fileName } : {}),
        });
    if (message) setError(plainProjectError(message));
    else onClose();
  }

  const missing = !deliverable && (kind === "link" ? !url.trim() || !name.trim() : !file);

  return (
    <FormSheet
      title={deliverable ? "Edit deliverable" : "New deliverable"}
      description={deliverable ? `${deliverable.kind === "link" ? "Link" : "File"} on ${project.code}` : `Add a link or a file to ${project.code}.`}
      onClose={onClose}
      submitLabel={uploading ? "Uploading…" : deliverable ? "Save changes" : "Add deliverable"}
      submitDisabled={uploading || missing || !categoryId || !statusId}
      onSubmit={() => void save()}
      secondary={
        deliverable ? (
          <ConfirmAction
            trigger={
              <Button type="button" variant="ghost" className="text-destructive-foreground">
                Delete
              </Button>
            }
            title={`Delete “${deliverable.name}”?`}
            description="It comes off the project and every work item it is attached to. Project progress is recounted."
            confirmLabel="Delete deliverable"
            onConfirm={() => {
              const message = onDelete(deliverable.id);
              if (message) setError(plainProjectError(message));
              else onClose();
            }}
          />
        ) : undefined
      }
    >
      {deliverable ? null : (
        <Fieldset className="grid gap-2">
          <FieldsetLegend className="text-sm font-medium text-ink">Kind</FieldsetLegend>
          <ToggleGroup
            variant="outline"
            aria-label="Kind"
            value={[kind]}
            onValueChange={(value) => {
              const next = value[0] as DeliverableKind | undefined;
              if (next) setKind(next);
            }}
            className="w-full *:flex-1"
          >
            <ToggleGroupItem value="link">Link</ToggleGroupItem>
            <ToggleGroupItem value="file">File</ToggleGroupItem>
          </ToggleGroup>
        </Fieldset>
      )}

      <Field label="Name" hint={kind === "file" && !deliverable ? "Optional. Without one, the file name is used." : undefined}>
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>

      {kind === "link" ? (
        <Field label="Link" hint={deliverable ? "Saving a new address replaces the old one." : undefined}>
          <Input type="url" inputMode="url" placeholder="https://" value={url} onChange={(event) => setUrl(event.target.value)} />
        </Field>
      ) : (
        <Field
          label={deliverable ? "Upload a new version" : "File"}
          hint={deliverable ? "Earlier versions stay listed below." : "Uploads when you choose Add deliverable."}
        >
          <Input type="file" disabled={uploading} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <Select value={statusId} onChange={(event) => setStatusId(event.target.value)}>
            {statuses.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category">
          <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {categories.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Fieldset className="grid gap-2">
        <FieldsetLegend className="text-sm font-medium text-ink">Work items</FieldsetLegend>
        {workItems.length === 0 ? (
          <p className="m-0 text-sm text-muted">This project has no work items yet. The deliverable can still be added.</p>
        ) : (
          <CheckboxGroup aria-label="Work items" value={workItemIds} onValueChange={(value) => setWorkItemIds(value as string[])} className="grid gap-1">
            {workItems.map((row) => (
              <label key={row.id} className="flex min-h-9 items-center gap-2 text-sm pointer-coarse:min-h-11">
                <Checkbox value={row.id} />
                <span className="min-w-0 truncate">{row.name}</span>
              </label>
            ))}
          </CheckboxGroup>
        )}
      </Fieldset>

      {deliverable?.kind === "file" && versions.length > 0 ? (
        <section className="grid gap-2">
          <h3 className="m-0 text-sm font-medium">Versions</h3>
          <ol className="m-0 grid list-none gap-1 p-0">
            {versions.map((version, index) => (
              <li key={version.id} className="flex items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 text-sm hover:bg-wash">
                <a href={storedFileHref(version.storagePath)} target="_blank" rel="noreferrer" className="min-w-0 truncate text-ink hover:underline">
                  {version.fileName}
                </a>
                <span className="shrink-0 text-xs text-muted tabular-nums">
                  {index === 0 ? "Latest · " : ""}
                  {formatDate(version.uploadedAt.slice(0, 10))}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}

/** Open the link, or the latest file version, in a new tab. */
export function DeliverableOpen({ deliverable, compact = false }: { deliverable: Deliverable; compact?: boolean }) {
  const latest = deliverable.versions[deliverable.versions.length - 1];
  const href = deliverable.kind === "link" ? deliverable.url : latest ? storedFileHref(latest.storagePath) : null;
  if (!href) return null;
  const Icon = deliverable.kind === "link" ? ExternalLinkIcon : FileIcon;
  return (
    <Button
      variant="outline"
      size={compact ? "icon-sm" : "sm"}
      aria-label={compact ? `Open ${deliverable.name}` : undefined}
      render={<a href={href} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} />}
    >
      <Icon aria-hidden="true" />
      {compact ? null : deliverable.kind === "link" ? "Open link" : `Open ${latest?.fileName ?? "file"}`}
    </Button>
  );
}
