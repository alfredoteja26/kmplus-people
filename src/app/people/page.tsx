"use client";

import { peopleListDescription } from "@/components/people/copy";
import { PeopleSubnav } from "@/components/people/PeopleSubnav";
import { Button } from "@/components/coss/button";
import { Callout, PageHeader } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { Input } from "@/components/coss/input";
import { Select } from "@/components/product/Select";
import { AppDialog } from "@/components/product/AppDialog";
import { StatusBadge } from "@/components/product/StatusBadge";
import { Table, Td, Th } from "@/components/product/Table";
import { currentAssignment, employmentFor, isHrLike, positionById, todayIso, visiblePeople } from "@/lib/domain";
import { statusLabel } from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { ContractType, EmploymentStatus } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function PeoplePage() {
  const { state, createPerson } = useStore();
  const [open, setOpen] = useState(false);
  const people = visiblePeople(state);
  const hr = isHrLike(state.currentRole);
  const [query, setQuery] = useState("");
  const showSearch = hr || people.length > 8;
  const needle = query.trim().toLowerCase();
  const rows = useMemo(() => {
    return people.map((person) => {
      const assignment = currentAssignment(state, person.id);
      const position = assignment ? positionById(state, assignment.positionId) : undefined;
      return { person, position, employment: employmentFor(state, person.id) };
    });
  }, [people, state]);
  const shown = needle
    ? rows.filter(({ person, position }) =>
        [person.legalName, person.preferredName ?? "", person.email, position?.title ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : rows;

  return (
    <div>
      <PageHeader
        title="People"
        description={peopleListDescription(state.currentRole, hr)}
        actions={
          hr ? (
            <Button type="button" onClick={() => setOpen(true)}>
              Add person
            </Button>
          ) : null
        }
      />
      <PeopleSubnav />
      {people.length === 0 ? (
        <Callout>
          {hr
            ? "No people yet. Add a person to start their employment record, then assign a position from their profile."
            : "No profiles are available to you yet. Ask HR to set up your employment record."}
        </Callout>
      ) : (
        <>
          {showSearch ? (
            <div className="mb-4 max-w-sm">
              <Field label="Search people">
                <Input
                  type="search"
                  placeholder="Name, email, or position"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </Field>
            </div>
          ) : null}
          {shown.length === 0 ? (
            <Callout>No one matches &ldquo;{query.trim()}&rdquo;. Try part of a name or position.</Callout>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Employment status</Th>
                  <Th>Position</Th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ person, employment, position }) => (
                  <tr key={person.id}>
                    <Td>
                      <Link href={`/people/${person.id}`} className="font-medium text-accent no-underline hover:underline">
                        {person.legalName}
                      </Link>
                      {person.preferredName && person.preferredName !== person.legalName ? (
                        <span className="ml-1 text-muted">({person.preferredName})</span>
                      ) : null}
                    </Td>
                    <Td>{person.email}</Td>
                    <Td>{employment ? <StatusBadge status={employment.status} /> : "—"}</Td>
                    <Td>{position?.title ?? "Unassigned"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {needle && shown.length > 0 ? (
            <p className="mt-2 mb-0 text-sm text-muted" aria-live="polite">
              {shown.length} of {rows.length} people
            </p>
          ) : null}
        </>
      )}
      {open ? (
        <CreatePersonModal
          onClose={() => setOpen(false)}
          onCreate={(input) => {
            createPerson(input);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function CreatePersonModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: {
    legalName: string;
    preferredName: string;
    email: string;
    phone: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    joinDate: string;
    contractType: ContractType;
    status: EmploymentStatus;
  }) => void;
}) {
  const [legalName, setLegalName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [joinDate, setJoinDate] = useState(todayIso());
  const [contractType, setContractType] = useState<ContractType>("permanent");
  const [status, setStatus] = useState<EmploymentStatus>("draft-hire");

  return (
    <AppDialog title="Add person" onClose={onClose}>
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate({
            legalName,
            preferredName,
            email,
            phone,
            emergencyContactName,
            emergencyContactPhone,
            joinDate,
            contractType,
            status,
          });
        }}
      >
        <Field label="Legal name">
          <Input required value={legalName} onChange={(event) => setLegalName(event.target.value)} />
        </Field>
        <Field label="Preferred name">
          <Input value={preferredName} onChange={(event) => setPreferredName(event.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Emergency contact">
          <Input value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} />
        </Field>
        <Field label="Emergency phone">
          <Input value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} />
        </Field>
        <Field label="Join date">
          <Input type="date" value={joinDate} onChange={(event) => setJoinDate(event.target.value)} />
        </Field>
        <Field label="Contract type">
          <Select value={contractType} onChange={(event) => setContractType(event.target.value as ContractType)}>
            <option value="permanent">Permanent</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </Select>
        </Field>
        <Field label="Employment status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as EmploymentStatus)}>
            <option value="draft-hire">{statusLabel("draft-hire")}</option>
            <option value="active">{statusLabel("active")}</option>
            <option value="resigned">{statusLabel("resigned")}</option>
          </Select>
        </Field>
        <Button type="submit">Add person</Button>
      </form>
    </AppDialog>
  );
}
