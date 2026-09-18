"use client";

import { peopleListDescription } from "@/components/people/copy";
import { PeopleSubnav } from "@/components/people/PeopleSubnav";
import { Button } from "@/components/ui/Button";
import { Callout, PageHeader } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Table, Td, Th } from "@/components/ui/Table";
import { currentAssignment, employmentFor, isHrLike, positionById, todayIso, visiblePeople } from "@/lib/domain";
import { useStore } from "@/lib/store";
import type { ContractType, EmploymentStatus } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

export default function PeoplePage() {
  const { state, createPerson } = useStore();
  const [open, setOpen] = useState(false);
  const people = visiblePeople(state);
  const hr = isHrLike(state.currentRole);

  return (
    <div>
      <PageHeader
        kicker="Person + Employment"
        title="People"
        description={peopleListDescription(state.currentRole, hr)}
        actions={
          hr ? (
            <Button type="button" onClick={() => setOpen(true)}>
              Create Person
            </Button>
          ) : null
        }
      />
      <PeopleSubnav />
      {people.length === 0 ? (
        <Callout>
          {hr
            ? "No People in this tenant yet. Create Person opens Employment; assign a Position from the profile when a seat is ready."
            : "No Person record is visible for your role. Switch to HR in the role switcher to seed the roster, or open your own profile when Employment exists."}
        </Callout>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Person</Th>
              <Th>Email</Th>
              <Th>Employment status</Th>
              <Th>Position</Th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => {
              const employment = employmentFor(state, person.id);
              const assignment = currentAssignment(state, person.id);
              const position = assignment ? positionById(state, assignment.positionId) : undefined;
              return (
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
              );
            })}
          </tbody>
        </Table>
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
    <Modal title="Create Person" onClose={onClose}>
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
            <option value="permanent">permanent</option>
            <option value="contract">contract</option>
            <option value="intern">intern</option>
          </Select>
        </Field>
        <Field label="Employment status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as EmploymentStatus)}>
            <option value="draft-hire">draft-hire</option>
            <option value="active">active</option>
            <option value="resigned">resigned</option>
          </Select>
        </Field>
        <Button type="submit">Save Person</Button>
      </form>
    </Modal>
  );
}
