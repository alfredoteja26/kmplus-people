"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { AppSheet } from "@/components/product/AppSheet";
import { Callout, Card, PageHeader } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDateRange } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

type Draft = {
  code: string;
  name: string;
  clientName: string;
  startDate: string;
  endDate: string;
};

const emptyDraft: Draft = { code: "", name: "", clientName: "", startDate: "", endDate: "" };

function draftFromProject(project: Project): Draft {
  return {
    code: project.code,
    name: project.name,
    clientName: project.clientName ?? "",
    startDate: project.startDate,
    endDate: project.endDate ?? "",
  };
}

function clientLabel(project: Project): string {
  return project.clientName?.trim() ? project.clientName : "Internal";
}

function datesLabel(project: Project): string {
  return formatDateRange(project.startDate, project.endDate);
}

export default function ProjectsPage() {
  const { state, openProject, updateProject } = useStore();
  const admin = hasAdminGrant(state);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  function beginOpen() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError("");
    setOpen(true);
  }

  function beginEdit(project: Project) {
    setEditingId(project.id);
    setDraft(draftFromProject(project));
    setError("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setError("");
  }

  function save() {
    const input = {
      code: draft.code,
      name: draft.name,
      clientName: draft.clientName.trim() || null,
      startDate: draft.startDate,
      endDate: draft.endDate.trim() || null,
    };
    const result = editingId ? updateProject(editingId, input) : openProject(input);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError("");
    setDraft(emptyDraft);
    setEditingId(null);
    setOpen(false);
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Client and internal projects."
      />
      {state.projects.length === 0 ? (
        <Card>
          <p className="m-0">
            {admin ? "No projects yet. Add the first client or internal project." : "No projects yet. An Admin adds them here."}
          </p>
          {admin ? (
            <Button type="button" className="mt-4 self-start" onClick={beginOpen}>
              New project
            </Button>
          ) : null}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 sm:p-0">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
            <h2 className="m-0 text-h2 font-medium">All projects</h2>
            {admin ? (
              <Button type="button" onClick={beginOpen}>
                New project
              </Button>
            ) : null}
          </div>
          <ul className="m-0 list-none p-0">
            {state.projects.map((project) => (
              <li
                key={project.id}
                className="grid grid-cols-1 gap-3 border-t border-line px-5 py-4 first:border-t-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <p className="m-0 font-mono text-sm">{project.code}</p>
                <div className="min-w-0">
                  <Link href={`/projects/${project.id}`} className="block truncate text-base font-medium text-ink no-underline hover:underline">
                    {project.name}
                  </Link>
                  <p className="m-0 mt-1 text-sm text-muted">{clientLabel(project)}</p>
                </div>
                <div className="sm:text-right">
                  <p className="m-0 text-sm tabular-nums">{datesLabel(project)}</p>
                  {admin ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 -ml-2 sm:ml-0 sm:-mr-2"
                      aria-label={`Edit ${project.name}`}
                      onClick={() => beginEdit(project)}
                    >
                      Edit project
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {admin && open ? (
        <AppSheet title={editingId ? "Edit project" : "New project"} onClose={close}>
          <p className="m-0 mb-4 text-sm text-muted">
            {editingId
              ? "Changes apply to this project, including a new code. No second project is created."
              : "Leave the client blank for internal work."}
          </p>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <Field label="Code">
              <Input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} />
            </Field>
            <Field label="Name">
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Client name">
              <Input
                value={draft.clientName}
                placeholder="Leave blank for internal work"
                onChange={(event) => setDraft({ ...draft, clientName: event.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <Input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} />
              </Field>
              <Field label="End date (optional)">
                <Input type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} />
              </Field>
            </div>
            {error ? <Callout tone="danger">{error}</Callout> : null}
            <Button type="submit" className="mt-1">
              {editingId ? "Save changes" : "Create project"}
            </Button>
          </form>
        </AppSheet>
      ) : null}
    </div>
  );
}
