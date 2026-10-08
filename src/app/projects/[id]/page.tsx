"use client";

import { Button } from "@/components/coss/button";
import { Input } from "@/components/coss/input";
import { Callout, Card, PageHeader } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Select } from "@/components/product/Select";
import { Table, Td, Th } from "@/components/product/Table";
import { hasAdminGrant } from "@/lib/domain-query";
import { formatDate, formatDateRange, plural } from "@/lib/labels";
import { personLoadOverload } from "@/lib/work-delivery-query";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { useParams } from "next/navigation";
import { uploadWorkDeliveryFile } from "@/lib/upload-work-delivery";
import { useMemo, useState } from "react";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, addStaffing, upsertWorkItem, addDeliverable, updateDeliverable } = useStore();
  const project = state.projects.find((row) => row.id === params.id);
  const admin = hasAdminGrant(state);
  const staffings = state.staffings.filter((row) => row.projectId === params.id);
  const workItems = state.workItems.filter((row) => row.projectId === params.id);
  const deliverables = state.deliverables.filter((row) => row.projectId === params.id);

  const [personId, setPersonId] = useState(state.people[0]?.id ?? "");
  const [load, setLoad] = useState("50");
  const [staffStart, setStaffStart] = useState(project?.startDate ?? "");
  const [staffError, setStaffError] = useState("");

  const [wiName, setWiName] = useState("");
  const [wiPic, setWiPic] = useState("");
  const [wiStart, setWiStart] = useState(project?.startDate ?? "");
  const [wiEnd, setWiEnd] = useState(project?.endDate ?? project?.startDate ?? "");
  const [wiError, setWiError] = useState("");

  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileCategoryId, setFileCategoryId] = useState(state.deliverableCategories[0]?.id ?? "");
  const [fileUploading, setFileUploading] = useState(false);
  const [delError, setDelError] = useState("");

  const picOptions = useMemo(() => {
    const ids = new Set(staffings.map((row) => row.personId));
    return state.people.filter((row) => ids.has(row.id));
  }, [staffings, state.people]);

  if (!project) {
    return (
      <div>
        <PageHeader title="Project not found" />
        <Callout tone="warning">
          This project doesn&apos;t exist or was removed.{" "}
          <Link href="/projects" className="font-medium text-accent underline-offset-2 hover:underline">
            Go back to Projects
          </Link>{" "}
          to pick another.
        </Callout>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={project.name}
        description={`${project.code} · ${project.clientName?.trim() || "Internal"} · ${formatDateRange(project.startDate, project.endDate)}`}
      />

      <section>
        <h2 className="mt-0 mb-3 text-h2 font-medium">Staffing</h2>
        {staffings.length === 0 ? (
          <p className="m-0 text-sm text-muted">
            {admin ? "No one is staffed on this project yet. Add someone below." : "No one is staffed on this project yet."}
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Person</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Load</Th>
                <Th>Over capacity</Th>
              </tr>
            </thead>
            <tbody>
              {staffings.map((row) => {
                const person = state.people.find((item) => item.id === row.personId);
                const overload = personLoadOverload(state, row.personId);
                return (
                  <tr key={row.id}>
                    <Td>{person?.preferredName || person?.legalName || "Unknown person"}</Td>
                    <Td>{formatDate(row.startDate)}</Td>
                    <Td>{formatDate(row.endDate) || "—"}</Td>
                    <Td>{row.load}%</Td>
                    <Td>{overload > 0 ? `${overload}%` : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {admin ? (
          <Card className="mt-4 max-w-xl">
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const result = addStaffing({
                  personId,
                  projectId: project.id,
                  startDate: staffStart,
                  load: Number(load),
                });
                setStaffError(result.error ?? "");
              }}
            >
              <Field label="Person">
                <Select value={personId} onChange={(event) => setPersonId(event.target.value)}>
                  {state.people.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.preferredName || row.legalName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start date">
                <Input type="date" value={staffStart} onChange={(event) => setStaffStart(event.target.value)} />
              </Field>
              <Field label="Load (% of full time)">
                <Input inputMode="numeric" pattern="[0-9]*" value={load} onChange={(event) => setLoad(event.target.value)} />
              </Field>
              {staffError ? <Callout tone="danger">{staffError}</Callout> : null}
              <Button type="submit" className="justify-self-start">
                Add to project
              </Button>
            </form>
          </Card>
        ) : null}
      </section>

      <section>
        <h2 className="mt-0 mb-3 text-h2 font-medium">Work items</h2>
        {workItems.length === 0 ? (
          <p className="m-0 text-sm text-muted">
            {admin || picOptions.length > 0
              ? "No work items yet. Add the first one below."
              : "No work items yet. Staff someone on this project first; they can then be put in charge of a work item."}
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>PIC</Th>
                <Th>Start</Th>
                <Th>End</Th>
              </tr>
            </thead>
            <tbody>
              {workItems.map((row) => {
                const pic = state.people.find((item) => item.id === row.picPersonId);
                return (
                  <tr key={row.id}>
                    <Td>{row.name}</Td>
                    <Td>{pic?.preferredName || pic?.legalName || "Unknown person"}</Td>
                    <Td>{formatDate(row.startDate)}</Td>
                    <Td>{formatDate(row.endDate)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {(admin || picOptions.length > 0) && (
          <Card className="mt-4 max-w-xl">
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const result = upsertWorkItem({
                  projectId: project.id,
                  name: wiName,
                  picPersonId: wiPic || picOptions[0]?.id || "",
                  startDate: wiStart,
                  endDate: wiEnd,
                });
                setWiError(result.error ?? "");
                if (!result.error) setWiName("");
              }}
            >
              <Field label="Work item name">
                <Input value={wiName} onChange={(event) => setWiName(event.target.value)} />
              </Field>
              <Field label="Person in charge">
                <Select value={wiPic || picOptions[0]?.id || ""} onChange={(event) => setWiPic(event.target.value)}>
                  {picOptions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.preferredName || row.legalName}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start date">
                <Input type="date" value={wiStart} onChange={(event) => setWiStart(event.target.value)} />
              </Field>
              <Field label="End date">
                <Input type="date" value={wiEnd} onChange={(event) => setWiEnd(event.target.value)} />
              </Field>
              {wiError ? <Callout tone="danger">{wiError}</Callout> : null}
              <Button type="submit" className="justify-self-start">
                Add work item
              </Button>
            </form>
          </Card>
        )}
      </section>

      <section>
        <h2 className="mt-0 mb-3 text-h2 font-medium">Deliverables</h2>
        {deliverables.length === 0 ? (
          <p className="m-0 text-sm text-muted">No deliverables yet. Add a link or upload a file below.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Category</Th>
                <Th>Upload new version</Th>
              </tr>
            </thead>
            <tbody>
              {deliverables.map((row) => {
                const status = state.deliverableStatuses.find((item) => item.id === row.statusId);
                const category = state.deliverableCategories.find((item) => item.id === row.categoryId);
                const latestVersion = row.versions[row.versions.length - 1];
                return (
                  <tr key={row.id}>
                    <Td>
                      {row.kind === "link" && row.url ? (
                        <a href={row.url} className="text-ink hover:underline" target="_blank" rel="noreferrer">
                          {row.name}
                        </a>
                      ) : (
                        row.name
                      )}
                      {row.kind === "file" && latestVersion ? (
                        <p className="m-0 mt-1 text-xs text-muted">
                          {latestVersion.fileName} · {plural(row.versions.length, "version")}
                        </p>
                      ) : null}
                    </Td>
                    <Td>{row.kind === "link" ? "Link" : "File"}</Td>
                    <Td>{status?.name ?? "—"}</Td>
                    <Td>{category?.name ?? "—"}</Td>
                    <Td>
                      {row.kind === "file" ? (
                        <Input
                          type="file"
                          aria-label={`Upload a new version of ${row.name}`}
                          className="max-w-[12rem]"
                          disabled={fileUploading}
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setFileUploading(true);
                            const uploaded = await uploadWorkDeliveryFile(file, "deliverable");
                            setFileUploading(false);
                            if (uploaded.error || !uploaded.storagePath) {
                              setDelError(uploaded.error || "The file could not be uploaded. Try again.");
                              return;
                            }
                            setDelError(
                              updateDeliverable(row.id, {
                                storagePath: uploaded.storagePath,
                                fileName: uploaded.fileName,
                              }).error ?? "",
                            );
                            event.target.value = "";
                          }}
                        />
                      ) : (
                        "—"
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <Card className="mt-4 grid max-w-xl gap-3">
          {delError ? <Callout tone="danger">{delError}</Callout> : null}
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const result = addDeliverable({
                projectId: project.id,
                kind: "link",
                name: linkName,
                categoryId: state.deliverableCategories[0]?.id ?? "",
                url: linkUrl,
              });
              setDelError(result.error ?? "");
              if (!result.error) {
                setLinkName("");
                setLinkUrl("");
              }
            }}
          >
            <Field label="Link deliverable name">
              <Input value={linkName} onChange={(event) => setLinkName(event.target.value)} />
            </Field>
            <Field label="URL">
              <Input type="url" inputMode="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
            </Field>
            <Button type="submit" className="justify-self-start">
              Add link
            </Button>
          </form>
          <div className="grid gap-3 border-t border-line pt-4">
            <Field label="File deliverable name (optional)">
              <Input value={fileName} onChange={(event) => setFileName(event.target.value)} />
            </Field>
            <Field label="Category">
              <Select value={fileCategoryId} onChange={(event) => setFileCategoryId(event.target.value)}>
                {state.deliverableCategories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Upload a file">
              <Input
                type="file"
                disabled={fileUploading}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setFileUploading(true);
                  setDelError("");
                  const uploaded = await uploadWorkDeliveryFile(file, "deliverable");
                  setFileUploading(false);
                  if (uploaded.error || !uploaded.storagePath) {
                    setDelError(uploaded.error || "The file could not be uploaded. Try again.");
                    return;
                  }
                  const result = addDeliverable({
                    projectId: project.id,
                    kind: "file",
                    name: fileName || uploaded.fileName,
                    categoryId: fileCategoryId,
                    storagePath: uploaded.storagePath,
                    fileName: uploaded.fileName,
                  });
                  setDelError(result.error ?? "");
                  if (!result.error) {
                    setFileName("");
                    event.target.value = "";
                  }
                }}
              />
            </Field>
            <p className="m-0 text-xs text-muted">
              Choosing a file uploads it and adds it as a deliverable. Without a name, the file name is used.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
