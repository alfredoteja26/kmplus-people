"use client";

import { PeopleSubnav } from "@/components/people/PeopleSubnav";
import { Button } from "@/components/coss/button";
import { Callout, Card, PageHeader } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { Badge } from "@/components/product/Badge";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
import { Select } from "@/components/product/Select";
import { StatusBadge } from "@/components/product/StatusBadge";
import { Table, Td, Th } from "@/components/product/Table";
import {
  assignmentForPosition,
  canReadPerson,
  currentAssignment,
  employmentFor,
  emptySeats,
  isHrLike,
  positionById,
  todayIso,
} from "@/lib/domain";
import { canAccessKpiAdmin } from "@/lib/domain-query";
import { formatDate, plural, statusLabel } from "@/lib/labels";
import { useStore } from "@/lib/store";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";

const CORRECTION_FIELD_LABELS: Record<string, string> = {
  phone: "Phone",
  email: "Contact email",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
  linkedIn: "LinkedIn",
  preferredName: "Preferred name",
  legalName: "Legal name",
};

const CONTRACT_LABELS: Record<string, string> = { permanent: "Permanent", contract: "Contract", intern: "Intern" };

const KIND_LABELS: Record<string, string> = {
  work: "Work",
  organization: "Organization",
  volunteer: "Volunteer",
  technical: "Technical",
  language: "Language",
  personal: "Personal",
};

function correctionFieldLabel(field: string) {
  return CORRECTION_FIELD_LABELS[field] ?? statusLabel(field);
}

export default function PersonPage() {
  const params = useParams<{ id: string }>();
  const {
    state,
    assignPosition,
    requestCorrection,
    resolveCorrection,
    confirmHire,
    grantAdmin,
    revokeAdmin,
    updatePersonContact,
  } = useStore();
  const person = state.people.find((row) => row.id === params.id);
  const hr = isHrLike(state.currentRole);
  const canSetLoginEmail = state.currentRole === "hr";
  const canManageAdminGrant = state.currentRole === "hr" || canAccessKpiAdmin(state);
  const canEditContact = state.currentPersonId === params.id || canAccessKpiAdmin(state);
  const isSelf = state.currentPersonId === params.id;
  const loginUser = person ? state.users.find((row) => row.personId === person.id) : undefined;
  const seats = emptySeats(state);
  const [positionId, setPositionId] = useState(seats[0]?.id ?? "");
  const [field, setField] = useState("phone");
  const [loginEmailDraft, setLoginEmailDraft] = useState("");
  const [loginEmailTouched, setLoginEmailTouched] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState("");
  const [loginEmailPending, setLoginEmailPending] = useState(false);
  const [proposed, setProposed] = useState("");
  const [contactError, setContactError] = useState("");
  const [contactSaved, setContactSaved] = useState(false);
  const [contactDraft, setContactDraft] = useState({
    preferredName: "",
    phone: "",
    email: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    linkedIn: "",
  });
  const [contactTouched, setContactTouched] = useState(false);
  const fieldCurrent = useMemo(() => {
    if (!person) return "";
    const record = person as unknown as Record<string, string>;
    return record[field] ?? "";
  }, [person, field]);
  const shownLoginEmail = loginEmailTouched ? loginEmailDraft : (loginUser?.email ?? "");

  async function saveLoginEmail() {
    if (!person) return;
    setLoginEmailError("");
    setLoginEmailPending(true);
    try {
      const response = await fetch("/api/auth/login-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: person.id, email: shownLoginEmail }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setLoginEmailError(payload.error || "We couldn't save the login email. Check the address and try again.");
        return;
      }
      window.location.reload();
    } catch {
      setLoginEmailError("We couldn't save the login email. Check your connection and try again.");
    } finally {
      setLoginEmailPending(false);
    }
  }

  if (!person || !canReadPerson(state, person.id)) {
    return (
      <div>
        <PageHeader title="Profile" />
        <PeopleSubnav />
        <Callout tone="warning">
          You don&apos;t have access to this profile.{" "}
          <Link href="/people" className="font-medium text-accent no-underline hover:underline">
            Back to People
          </Link>
        </Callout>
      </div>
    );
  }

  const employment = employmentFor(state, person.id);
  const assignment = currentAssignment(state, person.id);
  const position = assignment ? positionById(state, assignment.positionId) : undefined;
  const history = state.assignments
    .filter((row) => row.personId === person.id)
    .sort((left, right) => right.startDate.localeCompare(left.startDate));
  const currentRows = history.filter((row) => !row.endDate);
  const corrections = state.corrections.filter((row) => row.personId === person.id);
  const openCorrections = corrections.filter((row) => row.status === "open");
  const contactValues = contactTouched
    ? contactDraft
    : {
        preferredName: person?.preferredName ?? "",
        phone: person?.phone ?? "",
        email: person?.email ?? "",
        emergencyContactName: person?.emergencyContactName ?? "",
        emergencyContactPhone: person?.emergencyContactPhone ?? "",
        linkedIn: person?.linkedIn ?? "",
      };
  type ContactKey = keyof typeof contactValues;
  function editContact(key: ContactKey, value: string) {
    // Seed from the values on screen so editing one field never blanks the others.
    setContactDraft({ ...contactValues, [key]: value });
    setContactTouched(true);
    setContactSaved(false);
  }

  return (
    <div>
      <PageHeader
        title={person.legalName}
        description={person.preferredName || undefined}
        actions={
          <Link href="/people" className="text-sm font-medium text-accent no-underline hover:underline">
            Back to People
          </Link>
        }
      />
      <PeopleSubnav />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mt-0 mb-3 text-base font-medium">Identity</h2>
          <dl className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-y-2 [&_dd]:break-words [&_dd]:mb-2 sm:[&_dd]:mb-0">
            <dt className="text-faint">Legal name</dt>
            <dd className="m-0">{person.legalName}</dd>
            <dt className="text-faint">Preferred name</dt>
            <dd className="m-0">{person.preferredName || "—"}</dd>
            <dt className="text-faint">Email</dt>
            <dd className="m-0">{person.email}</dd>
            <dt className="text-faint">Phone</dt>
            <dd className="m-0">{person.phone || "—"}</dd>
            <dt className="text-faint">Emergency contact</dt>
            <dd className="m-0">
              {person.emergencyContactName || person.emergencyContactPhone
                ? `${person.emergencyContactName} ${person.emergencyContactPhone}`.trim()
                : "—"}
            </dd>
            <dt className="text-faint">LinkedIn</dt>
            <dd className="m-0">{person.linkedIn || "—"}</dd>
          </dl>
          {canEditContact ? (
            <form
              className="mt-4 grid gap-3 border-t border-line pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                setContactError("");
                setContactSaved(false);
                const err = updatePersonContact(person.id, {
                  preferredName: contactValues.preferredName,
                  phone: contactValues.phone,
                  email: contactValues.email,
                  emergencyContactName: contactValues.emergencyContactName,
                  emergencyContactPhone: contactValues.emergencyContactPhone,
                  linkedIn: contactValues.linkedIn || null,
                }).error;
                if (err) setContactError(err);
                else {
                  setContactSaved(true);
                  setContactTouched(false);
                }
              }}
            >
              <p className="m-0 text-sm text-muted">You can update these contact details yourself.</p>
              <Field label="Preferred name">
                <Input
                  value={contactValues.preferredName}
                  onChange={(event) => editContact("preferredName", event.target.value)}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={contactValues.phone}
                  onChange={(event) => editContact("phone", event.target.value)}
                />
              </Field>
              <Field label="Contact email">
                <Input
                  type="email"
                  value={contactValues.email}
                  onChange={(event) => editContact("email", event.target.value)}
                />
              </Field>
              <Field label="Emergency contact name">
                <Input
                  value={contactValues.emergencyContactName}
                  onChange={(event) => editContact("emergencyContactName", event.target.value)}
                />
              </Field>
              <Field label="Emergency contact phone">
                <Input
                  value={contactValues.emergencyContactPhone}
                  onChange={(event) => editContact("emergencyContactPhone", event.target.value)}
                />
              </Field>
              <Field label="LinkedIn">
                <Input
                  value={contactValues.linkedIn}
                  onChange={(event) => editContact("linkedIn", event.target.value)}
                />
              </Field>
              {contactError ? <Callout tone="danger">{contactError}</Callout> : null}
              {contactSaved ? <Callout live="status">Contact details saved.</Callout> : null}
              <Button type="submit">Save contact details</Button>
            </form>
          ) : null}
        </Card>
        <Card>
          <h2 className="mt-0 mb-3 text-base font-medium">Employment</h2>
          {employment ? (
            <dl className="grid grid-cols-1 gap-y-1 text-sm sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-y-2 [&_dd]:break-words [&_dd]:mb-2 sm:[&_dd]:mb-0">
              <dt className="text-faint">Status</dt>
              <dd className="m-0">
                <StatusBadge status={employment.status} />
              </dd>
              <dt className="text-faint">Contract</dt>
              <dd className="m-0">{CONTRACT_LABELS[employment.contractType] ?? statusLabel(employment.contractType)}</dd>
              <dt className="text-faint">Join date</dt>
              <dd className="m-0">{formatDate(employment.joinDate)}</dd>
              {currentRows.length > 1 ? (
                <>
                  <dt className="text-faint">Current positions</dt>
                  <dd className="m-0">
                    <p className="mt-0 mb-1 text-muted">Holds {currentRows.length} positions at the same time.</p>
                    <ul className="m-0 list-none space-y-1 p-0">
                      {currentRows.map((row) => {
                        const held = positionById(state, row.positionId);
                        const grade = held ? state.grades.find((item) => item.id === held.gradeId)?.name : undefined;
                        return (
                          <li key={row.id}>
                            <span className="font-medium">{held?.title ?? "—"}</span>
                            {grade ? ` · ${grade}` : null}
                            <span className="text-muted"> · since {formatDate(row.startDate)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </dd>
                </>
              ) : (
                <>
                  <dt className="text-faint">Current position</dt>
                  <dd className="m-0">
                    {position?.title ?? "Unassigned"}
                    {assignment ? <span className="text-muted"> · since {formatDate(assignment.startDate)}</span> : null}
                  </dd>
                  <dt className="text-faint">Grade</dt>
                  <dd className="m-0">
                    {position ? state.grades.find((grade) => grade.id === position.gradeId)?.name : "—"}
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="m-0 text-sm text-muted">No employment record yet.</p>
          )}
          {hr && employment?.status === "draft-hire" ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mt-0 mb-3 text-sm text-muted">This person is a draft hire. They join the active roster once you confirm the hire.</p>
              <Button type="button" onClick={() => confirmHire(person.id)}>
                Confirm hire
              </Button>
            </div>
          ) : null}
          {canSetLoginEmail ? (
            <form
              className="mt-4 grid gap-3 border-t border-line pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                void saveLoginEmail();
              }}
            >
              <Field label="Login email">
                <Input
                  type="email"
                  value={shownLoginEmail}
                  onChange={(event) => {
                    setLoginEmailTouched(true);
                    setLoginEmailDraft(event.target.value);
                  }}
                  required
                />
              </Field>
              <p className="m-0 text-sm text-muted">
                This is the address they sign in with. It doesn&apos;t change their contact email. Saving a new @kmplus.co.id address sends them a link to set a password.
              </p>
              {loginEmailError ? <Callout tone="danger">{loginEmailError}</Callout> : null}
              <Button type="submit" disabled={loginEmailPending}>
                {loginEmailPending ? "Saving…" : loginUser ? "Save login email" : "Create login"}
              </Button>
            </form>
          ) : loginUser ? (
            <div className="mt-4">
              <Callout>Signs in with {loginUser.email}</Callout>
            </div>
          ) : null}
          {canManageAdminGrant && loginUser ? (
            <div className="mt-4">
              <p className="mt-0 mb-2 text-sm text-muted">
                {loginUser.adminGrant
                  ? "Has Admin access, in addition to their usual role."
                  : "No Admin access. Admin access adds to their usual role."}
              </p>
              {loginUser.adminGrant ? (
                <ConfirmAction
                  trigger={
                    <Button variant="destructive-outline" size="sm" type="button">
                      Remove Admin access
                    </Button>
                  }
                  title={`Remove Admin access from ${person.legalName}?`}
                  description="They keep their usual role but can no longer run KPI Admin, open every KPI Portfolio, or manage Admin settings."
                  confirmLabel="Remove Admin access"
                  onConfirm={() => revokeAdmin(person.id)}
                />
              ) : (
                <Button variant="outline" size="sm" type="button" onClick={() => grantAdmin(person.id)}>
                  Give Admin access
                </Button>
              )}
            </div>
          ) : null}
        </Card>
      </div>

      <div className="mt-4 grid gap-4">
        <Card>
          <h2 className="mt-0 mb-3 text-base font-medium">Education</h2>
          {person.educations.length === 0 ? (
            <p className="m-0 text-sm text-muted">No reviewed education yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Institution</Th>
                  <Th>Credential</Th>
                  <Th>Dates</Th>
                  <Th>GPA</Th>
                </tr>
              </thead>
              <tbody>
                {person.educations.map((row, index) => (
                  <tr key={`${row.institution}-${index}`}>
                    <Td>{row.institution}</Td>
                    <Td>{row.credential}</Td>
                    <Td>{[row.startDate, row.endDate].filter(Boolean).join(" – ") || "—"}</Td>
                    <Td>{row.gpa ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <h2 className="mt-0 mb-3 text-base font-medium">Experience</h2>
          {person.experiences.length === 0 ? (
            <p className="m-0 text-sm text-muted">No reviewed experience yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Title</Th>
                  <Th>Organization</Th>
                  <Th>Dates</Th>
                  <Th>Summary</Th>
                </tr>
              </thead>
              <tbody>
                {person.experiences.map((row, index) => (
                  <tr key={`${row.organization}-${row.title}-${index}`}>
                    <Td>{KIND_LABELS[row.kind] ?? statusLabel(row.kind)}</Td>
                    <Td>{row.title}</Td>
                    <Td>{row.organization}</Td>
                    <Td>{[row.startDate, row.endDate].filter(Boolean).join(" – ") || "—"}</Td>
                    <Td>{row.narrative || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <h2 className="mt-0 mb-3 text-base font-medium">Certifications</h2>
          {person.certificationRows.length === 0 ? (
            <p className="m-0 text-sm text-muted">No reviewed certifications yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Issuer</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {person.certificationRows.map((row, index) => (
                  <tr key={`${row.name}-${index}`}>
                    <Td>{row.name}</Td>
                    <Td>{row.issuer}</Td>
                    <Td>{row.date ? formatDate(row.date) : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <h2 className="mt-0 mb-3 text-base font-medium">Skills</h2>
          {person.skillRows.length === 0 ? (
            <p className="m-0 text-sm text-muted">No reviewed skills yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Type</Th>
                </tr>
              </thead>
              <tbody>
                {person.skillRows.map((row, index) => (
                  <tr key={`${row.name}-${row.kind}-${index}`}>
                    <Td>{row.name}</Td>
                    <Td>{KIND_LABELS[row.kind] ?? statusLabel(row.kind)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {hr ? (
        <Card className="mt-4">
          <h2 className="mt-0 mb-3 text-base font-medium">Assign position</h2>
          <p className="mt-0 mb-3 text-sm text-muted">
            Assigning a new position ends the current one. Only empty positions can be chosen.
          </p>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!positionId) return;
              const taken = assignmentForPosition(state, positionId);
              if (taken && taken.personId !== person.id) return;
              assignPosition(person.id, positionId, todayIso());
            }}
          >
            <div className="min-w-[240px] flex-1">
              <Field label="Position">
                <Select value={positionId} onChange={(event) => setPositionId(event.target.value)}>
                  <option value="">Select a position</option>
                  {seats.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      {seat.title} · Empty
                    </option>
                  ))}
                  {state.positions
                    .filter((row) => !seats.some((seat) => seat.id === row.id))
                    .map((row) => (
                      <option key={row.id} value={row.id} disabled>
                        {row.title} · Filled
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={!positionId}>
              Assign position
            </Button>
          </form>
        </Card>
      ) : null}

      {isSelf && !hr ? (
        <Card className="mt-4">
          <h2 className="mt-0 mb-3 text-base font-medium">Request a correction</h2>
          <p className="mt-0 mb-3 text-sm text-muted">Ask HR to correct a detail you can&apos;t edit.</p>
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!proposed.trim()) return;
              requestCorrection(person.id, field, fieldCurrent, proposed);
              setProposed("");
            }}
          >
            <Field label="Detail">
              <Select value={field} onChange={(event) => setField(event.target.value)}>
                {["phone", "email", "emergencyContactName", "emergencyContactPhone", "linkedIn"].map((key) => (
                  <option key={key} value={key}>
                    {correctionFieldLabel(key)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Current value">
              <Input value={fieldCurrent} readOnly />
            </Field>
            <Field label="Correct value">
              <Input value={proposed} onChange={(event) => setProposed(event.target.value)} required />
            </Field>
            <Button type="submit">Send request</Button>
          </form>
          {corrections.length > 0 ? (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="mt-0 mb-2 text-sm font-medium">Your requests</h3>
              <ul className="m-0 list-none space-y-2 p-0 text-sm">
                {corrections.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.status} />
                    <span>
                      {correctionFieldLabel(row.field)}: {row.currentValue || "—"} → {row.proposedValue}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      {hr ? (
        <Card className="mt-4">
          <h2 className="mt-0 mb-3 text-base font-medium">Correction requests</h2>
          {corrections.length === 0 ? (
            <p className="m-0 text-sm text-muted">No correction requests for this person.</p>
          ) : (
            corrections.map((row) => (
              <div key={row.id} className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 last:mb-0 last:border-0 last:pb-0">
                <div className="min-w-0 break-words text-sm">
                  <StatusBadge status={row.status} /> {correctionFieldLabel(row.field)}: {row.currentValue || "—"} → {row.proposedValue}
                </div>
                {row.status === "open" ? (
                  <div className="flex gap-2">
                    <Button size="sm" type="button" onClick={() => resolveCorrection(row.id, "accepted")}>
                      Accept
                    </Button>
                    <ConfirmAction
                      trigger={
                        <Button variant="ghost" size="sm" type="button" className="text-destructive-foreground">
                          Reject
                        </Button>
                      }
                      title={`Reject the ${correctionFieldLabel(row.field).toLowerCase()} correction?`}
                      description={`${person.legalName} asked to change it to “${row.proposedValue}”. The profile keeps its current value and the request closes as rejected.`}
                      confirmLabel="Reject request"
                      onConfirm={() => resolveCorrection(row.id, "rejected")}
                    />
                  </div>
                ) : null}
              </div>
            ))
          )}
          {openCorrections.length > 0 ? (
            <p className="mb-0 mt-3 text-sm text-muted">{plural(openCorrections.length, "open request")} {openCorrections.length === 1 ? "needs" : "need"} a decision.</p>
          ) : null}
        </Card>
      ) : null}

      <Card className="mt-4">
        <h2 className="mt-0 mb-3 text-base font-medium">Position history</h2>
        {history.length === 0 ? (
          <p className="m-0 text-sm text-muted">No positions yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Position</Th>
                <Th>Start</Th>
                <Th>End</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <Td>{positionById(state, row.positionId)?.title ?? "—"}</Td>
                  <Td>{formatDate(row.startDate)}</Td>
                  <Td>{row.endDate ? formatDate(row.endDate) : <Badge tone="accent">Current</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="mt-0 mb-3 text-base font-medium">Projects</h2>
        {state.staffings.filter((row) => row.personId === person.id).length === 0 ? (
          <p className="m-0 text-sm text-muted">Not on any project.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Load</Th>
              </tr>
            </thead>
            <tbody>
              {state.staffings
                .filter((row) => row.personId === person.id)
                .map((row) => {
                  const project = state.projects.find((item) => item.id === row.projectId);
                  return (
                    <tr key={row.id}>
                      <Td>
                        <Link href={`/projects/${row.projectId}`} className="text-ink no-underline hover:underline">
                          {project?.code ?? row.projectId}
                        </Link>
                      </Td>
                      <Td>{formatDate(row.startDate)}</Td>
                      <Td>{row.endDate ? formatDate(row.endDate) : "—"}</Td>
                      <Td>{row.load}%</Td>
                    </tr>
                  );
                })}
            </tbody>
          </Table>
        )}
      </Card>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="mt-0 mb-0 text-base font-medium">Timesheet</h2>
          {isSelf ? (
            <div className="flex gap-3 text-sm">
              <Link href="/timesheet" className="font-medium text-accent no-underline hover:underline">
                Open timesheet
              </Link>
              <Link href="/leave/file" className="font-medium text-accent no-underline hover:underline">
                File leave
              </Link>
            </div>
          ) : null}
        </div>
        {state.timeBlocks.filter((row) => row.personId === person.id).length === 0 ? (
          <p className="m-0 text-sm text-muted">No time logged yet.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Hours</Th>
                <Th>Project</Th>
                <Th>Type</Th>
              </tr>
            </thead>
            <tbody>
              {state.timeBlocks
                .filter((row) => row.personId === person.id)
                .map((row) => {
                  const project = row.projectId
                    ? state.projects.find((item) => item.id === row.projectId)
                    : undefined;
                  const type = state.timeBlockTypes.find((item) => item.id === row.typeId);
                  const start = Date.parse(`${row.startAt}:00+07:00`);
                  const end = Date.parse(`${row.endAt}:00+07:00`);
                  const hours = Number.isFinite(start) && Number.isFinite(end) ? (end - start) / 3600000 : 0;
                  return (
                    <tr key={row.id}>
                      <Td>{formatDate(row.startAt.slice(0, 10))}</Td>
                      <Td>{hours}</Td>
                      <Td>{project?.code ?? "—"}</Td>
                      <Td>{type?.name ?? "—"}</Td>
                    </tr>
                  );
                })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
