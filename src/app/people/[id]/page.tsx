"use client";

import { PeopleSubnav } from "@/components/people/PeopleSubnav";
import { Button } from "@/components/ui/Button";
import { Callout, Card, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
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
import { useStore } from "@/lib/store";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function PersonPage() {
  const params = useParams<{ id: string }>();
  const { state, assignPosition, requestCorrection, resolveCorrection, confirmHire, grantAdmin, revokeAdmin } = useStore();
  const person = state.people.find((row) => row.id === params.id);
  const hr = isHrLike(state.currentRole);
  const canSetLoginEmail = state.currentRole === "hr";
  const canManageAdminGrant = state.currentRole === "hr" || canAccessKpiAdmin(state);
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
        setLoginEmailError(payload.error || "Could not save the login email.");
        return;
      }
      window.location.reload();
    } catch {
      setLoginEmailError("Could not save the login email.");
    } finally {
      setLoginEmailPending(false);
    }
  }

  if (!person || !canReadPerson(state, person.id)) {
    return (
      <div>
        <PageHeader kicker="Person + Employment" title="Profile" description="This record is outside your access scope." />
        <PeopleSubnav />
        <Callout tone="warning">This Person is not in your scope.</Callout>
      </div>
    );
  }

  const employment = employmentFor(state, person.id);
  const assignment = currentAssignment(state, person.id);
  const position = assignment ? positionById(state, assignment.positionId) : undefined;
  const history = state.assignments.filter((row) => row.personId === person.id);
  const corrections = state.corrections.filter((row) => row.personId === person.id);
  const openCorrections = corrections.filter((row) => row.status === "open");

  return (
    <div>
      <PageHeader
        kicker="Person + Employment"
        title={person.legalName}
        description={person.preferredName || undefined}
        actions={
          <Link href="/people" className="text-sm font-medium text-accent no-underline hover:underline">
            Back to roster
          </Link>
        }
      />
      <PeopleSubnav />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Identity</h2>
          <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
            <dt className="text-faint">Legal name</dt>
            <dd className="m-0">{person.legalName}</dd>
            <dt className="text-faint">Preferred</dt>
            <dd className="m-0">{person.preferredName || "—"}</dd>
            <dt className="text-faint">Email</dt>
            <dd className="m-0">{person.email}</dd>
            <dt className="text-faint">Phone</dt>
            <dd className="m-0">{person.phone || "—"}</dd>
            <dt className="text-faint">Emergency</dt>
            <dd className="m-0">
              {person.emergencyContactName || person.emergencyContactPhone
                ? `${person.emergencyContactName} ${person.emergencyContactPhone}`.trim()
                : "—"}
            </dd>
            <dt className="text-faint">LinkedIn</dt>
            <dd className="m-0">{person.linkedIn || "—"}</dd>
          </dl>
        </Card>
        <Card>
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Employment</h2>
          {employment ? (
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-faint">Status</dt>
              <dd className="m-0">
                <StatusBadge status={employment.status} />
              </dd>
              <dt className="text-faint">Contract</dt>
              <dd className="m-0">{employment.contractType}</dd>
              <dt className="text-faint">Join date</dt>
              <dd className="m-0">{employment.joinDate}</dd>
              <dt className="text-faint">Current Position</dt>
              <dd className="m-0">{position?.title ?? "Unassigned"}</dd>
              <dt className="text-faint">Grade</dt>
              <dd className="m-0">
                {position ? state.grades.find((grade) => grade.id === position.gradeId)?.name : "—"}
              </dd>
            </dl>
          ) : (
            <p className="m-0 text-sm text-muted">No Employment yet.</p>
          )}
          {hr && employment?.status === "draft-hire" ? (
            <div className="mt-4 border-t border-line pt-4">
              <p className="mt-0 mb-3 text-sm text-muted">Draft hire stays off the active roster until you confirm.</p>
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
                This is the sign-in address. It does not change the Person contact email. Saving a new @kmplus.co.id address sends the set-password email.
              </p>
              {loginEmailError ? <Callout tone="danger">{loginEmailError}</Callout> : null}
              <Button type="submit" disabled={loginEmailPending}>
                {loginEmailPending ? "Saving…" : loginUser ? "Save login email" : "Create login"}
              </Button>
            </form>
          ) : loginUser ? (
            <div className="mt-4">
              <Callout>Login email is {loginUser.email}.</Callout>
            </div>
          ) : null}
          {canManageAdminGrant && loginUser ? (
            <div className="mt-4">
              <p className="mt-0 mb-2 text-sm text-muted">
                Admin grant {loginUser.adminGrant ? "is on" : "is off"}. It stacks with this login role.
              </p>
              {loginUser.adminGrant ? (
                <Button variant="secondary" type="button" onClick={() => revokeAdmin(person.id)}>
                  Revoke Admin
                </Button>
              ) : (
                <Button type="button" onClick={() => grantAdmin(person.id)}>
                  Grant Admin
                </Button>
              )}
            </div>
          ) : null}
        </Card>
      </div>

      <div className="mt-4 grid gap-4">
        <Card>
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Education</h2>
          {person.educations.length === 0 ? (
            <p className="m-0 text-sm text-muted">No reviewed education rows yet.</p>
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
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Experience</h2>
          {person.experiences.length === 0 ? (
            <p className="m-0 text-sm text-muted">No reviewed experience rows yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Kind</Th>
                  <Th>Title</Th>
                  <Th>Organization</Th>
                  <Th>Dates</Th>
                  <Th>Summary</Th>
                </tr>
              </thead>
              <tbody>
                {person.experiences.map((row, index) => (
                  <tr key={`${row.organization}-${row.title}-${index}`}>
                    <Td>{row.kind}</Td>
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
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Certifications</h2>
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
                    <Td>{row.date || "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Skills</h2>
          {person.skillRows.length === 0 ? (
            <p className="m-0 text-sm text-muted">No reviewed skills yet.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Kind</Th>
                </tr>
              </thead>
              <tbody>
                {person.skillRows.map((row, index) => (
                  <tr key={`${row.name}-${row.kind}-${index}`}>
                    <Td>{row.name}</Td>
                    <Td>{row.kind}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {hr ? (
        <Card className="mt-4">
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Assign Position</h2>
          <p className="mt-0 mb-3 text-sm text-muted">
            Ends the current Assignment and opens a new one. Empty seats are listed first; filled seats stay disabled.
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
                  <option value="">Select a seat</option>
                  {seats.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      {seat.title} · empty
                    </option>
                  ))}
                  {state.positions
                    .filter((row) => !seats.some((seat) => seat.id === row.id))
                    .map((row) => (
                      <option key={row.id} value={row.id} disabled>
                        {row.title} · filled
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" disabled={!positionId}>
              Assign
            </Button>
          </form>
        </Card>
      ) : null}

      {isSelf && !hr ? (
        <Card className="mt-4">
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Request a correction</h2>
          <p className="mt-0 mb-3 text-sm text-muted">Legal name changes stay with HR. Propose contact or LinkedIn updates here.</p>
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (!proposed.trim()) return;
              requestCorrection(person.id, field, fieldCurrent, proposed);
              setProposed("");
            }}
          >
            <Field label="Field">
              <Select value={field} onChange={(event) => setField(event.target.value)}>
                <option value="phone">phone</option>
                <option value="email">email</option>
                <option value="emergencyContactName">emergency contact</option>
                <option value="emergencyContactPhone">emergency phone</option>
                <option value="linkedIn">LinkedIn</option>
              </Select>
            </Field>
            <Field label="Current">
              <Input value={fieldCurrent} readOnly />
            </Field>
            <Field label="Proposed">
              <Input value={proposed} onChange={(event) => setProposed(event.target.value)} required />
            </Field>
            <Button type="submit">Send to HR</Button>
          </form>
          {corrections.length > 0 ? (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="mt-0 mb-2 text-sm font-medium">Your requests</h3>
              <ul className="m-0 list-none space-y-2 p-0 text-sm">
                {corrections.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.status} />
                    <span>
                      {row.field}: {row.currentValue || "—"} → {row.proposedValue}
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
          <h2 className="mt-0 mb-3 text-[16px] font-medium">Correction requests</h2>
          {corrections.length === 0 ? (
            <p className="m-0 text-sm text-muted">No correction requests on this Person.</p>
          ) : (
            corrections.map((row) => (
              <div key={row.id} className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 last:mb-0 last:border-0 last:pb-0">
                <div className="text-sm">
                  <StatusBadge status={row.status} /> {row.field}: {row.currentValue || "—"} → {row.proposedValue}
                </div>
                {row.status === "open" ? (
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => resolveCorrection(row.id, "accepted")}>
                      Accept
                    </Button>
                    <Button variant="danger" type="button" onClick={() => resolveCorrection(row.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
          {openCorrections.length > 0 ? (
            <p className="mb-0 mt-3 text-sm text-muted">{openCorrections.length} open request(s) need a decision.</p>
          ) : null}
        </Card>
      ) : null}

      <Card className="mt-4">
        <h2 className="mt-0 mb-3 text-[16px] font-medium">Assignment history</h2>
        {history.length === 0 ? (
          <p className="m-0 text-sm text-muted">No Assignment rows yet. Assign a Position when a seat is ready.</p>
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
                  <Td>{row.startDate}</Td>
                  <Td>{row.endDate ?? "current"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
