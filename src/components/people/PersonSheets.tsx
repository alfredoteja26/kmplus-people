"use client";

import { Input } from "@/components/coss/input";
import { Callout } from "@/components/product/Card";
import { Field } from "@/components/product/Field";
import { FormSheet } from "@/components/product/FormSheet";
import { Select } from "@/components/product/Select";
import { StatusBadge } from "@/components/product/StatusBadge";
import type { ContactPatch, CreatePersonInput } from "@/lib/commands";
import { todayIso } from "@/lib/domain";
import { statusLabel } from "@/lib/labels";
import { plainPeopleError, type Seat } from "@/lib/people-view";
import type { ContractType, CorrectionRequest, EmploymentStatus, Person } from "@/lib/types";
import { useState } from "react";

const CORRECTION_FIELD_LABELS: Record<string, string> = {
  phone: "Phone",
  email: "Contact email",
  emergencyContactName: "Emergency contact name",
  emergencyContactPhone: "Emergency contact phone",
  linkedIn: "LinkedIn",
  preferredName: "Preferred name",
  legalName: "Legal name",
};

/** The details an employee may ask HR to correct. */
const CORRECTABLE = ["phone", "email", "emergencyContactName", "emergencyContactPhone", "linkedIn"] as const;

export function correctionFieldLabel(field: string) {
  return CORRECTION_FIELD_LABELS[field] ?? statusLabel(field);
}

/** Contact details. Editable for the Person and an Admin; everyone else gets the same sheet read-only. */
export function ContactSheet({
  person,
  canEdit,
  onClose,
  onSave,
}: {
  person: Person;
  canEdit: boolean;
  onClose: () => void;
  onSave: (patch: ContactPatch) => string | null | undefined;
}) {
  const [draft, setDraft] = useState({
    preferredName: person.preferredName ?? "",
    phone: person.phone ?? "",
    email: person.email ?? "",
    emergencyContactName: person.emergencyContactName ?? "",
    emergencyContactPhone: person.emergencyContactPhone ?? "",
    linkedIn: person.linkedIn ?? "",
  });
  const [error, setError] = useState("");
  const edit = (key: keyof typeof draft) => (event: { target: { value: string } }) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }));

  return (
    <FormSheet
      title={canEdit ? "Edit contact details" : "Contact details"}
      description={
        canEdit
          ? "Legal name and reviewed CV details change only through HR."
          : "Only this person or an Admin can change these details."
      }
      onClose={onClose}
      submitLabel={canEdit ? "Save contact details" : undefined}
      onSubmit={() => {
        const message = onSave({ ...draft, linkedIn: draft.linkedIn || null });
        if (message) setError(plainPeopleError(message));
        else onClose();
      }}
    >
      <Field label="Legal name" hint="Ask HR to correct it.">
        <Input value={person.legalName} readOnly />
      </Field>
      <Field label="Preferred name">
        <Input value={draft.preferredName} readOnly={!canEdit} onChange={edit("preferredName")} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone">
          <Input type="tel" value={draft.phone} readOnly={!canEdit} onChange={edit("phone")} />
        </Field>
        <Field label="Contact email" hint="Not the address they sign in with.">
          <Input type="email" value={draft.email} readOnly={!canEdit} onChange={edit("email")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emergency contact name">
          <Input value={draft.emergencyContactName} readOnly={!canEdit} onChange={edit("emergencyContactName")} />
        </Field>
        <Field label="Emergency contact phone">
          <Input type="tel" value={draft.emergencyContactPhone} readOnly={!canEdit} onChange={edit("emergencyContactPhone")} />
        </Field>
      </div>
      <Field label="LinkedIn">
        <Input value={draft.linkedIn} readOnly={!canEdit} placeholder={canEdit ? "linkedin.com/in/…" : undefined} onChange={edit("linkedIn")} />
      </Field>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}

/** An employee asks HR to correct a detail. Earlier requests and their outcome sit under the form. */
export function CorrectionSheet({
  person,
  requests,
  onClose,
  onSend,
}: {
  person: Person;
  requests: CorrectionRequest[];
  onClose: () => void;
  onSend: (field: string, currentValue: string, proposedValue: string) => void;
}) {
  const [field, setField] = useState<string>(CORRECTABLE[0]);
  const [proposed, setProposed] = useState("");
  const current = String((person as unknown as Record<string, string | undefined>)[field] ?? "");

  return (
    <FormSheet
      title="Request a correction"
      description="HR checks the new value and accepts or rejects it. Your profile keeps the current value until then."
      onClose={onClose}
      submitLabel="Send to HR"
      submitDisabled={!proposed.trim()}
      onSubmit={() => {
        onSend(field, current, proposed.trim());
        onClose();
      }}
    >
      <Field label="Detail">
        <Select value={field} onChange={(event) => setField(event.target.value)}>
          {CORRECTABLE.map((key) => (
            <option key={key} value={key}>
              {correctionFieldLabel(key)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Current value">
        <Input value={current || "Not set"} readOnly />
      </Field>
      <Field label="Correct value">
        <Input value={proposed} required onChange={(event) => setProposed(event.target.value)} />
      </Field>
      {requests.length > 0 ? (
        <div className="grid gap-2 border-t border-line pt-4">
          <h3 className="m-0 text-sm font-medium">Your requests</h3>
          <ul className="m-0 grid list-none gap-2 p-0 text-sm">
            {requests.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center gap-2">
                <StatusBadge status={row.status} />
                <span className="min-w-0 break-words">
                  {correctionFieldLabel(row.field)}: {row.currentValue || "Not set"} → {row.proposedValue}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </FormSheet>
  );
}

/** HR sets the address a Person signs in with. Saving a new address mails them a set-password link. */
export function LoginEmailSheet({
  person,
  loginEmail,
  onClose,
}: {
  person: Person;
  loginEmail: string | null;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(loginEmail ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/login-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: person.id, email }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "We couldn't save the login email. Check the address and try again.");
        return;
      }
      window.location.reload();
    } catch {
      setError("We couldn't save the login email. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <FormSheet
      title={loginEmail ? "Change login email" : "Create login"}
      description="This is the address they sign in with. It doesn't change their contact email."
      onClose={onClose}
      submitLabel={pending ? "Saving…" : loginEmail ? "Save login email" : "Create login"}
      submitDisabled={pending || !email.trim()}
      onSubmit={() => void save()}
    >
      <Field label="Login email" hint="Saving a new @kmplus.co.id address sends them a link to set a password.">
        <Input type="email" value={email} required onChange={(event) => setEmail(event.target.value)} />
      </Field>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}

/** HR seats a Person on an empty Position. Assigning ends every Position they hold today. */
export function AssignPositionSheet({
  person,
  seats,
  heldCount,
  onClose,
  onAssign,
}: {
  person: Person;
  seats: Seat[];
  heldCount: number;
  onClose: () => void;
  onAssign: (positionId: string) => void;
}) {
  const [positionId, setPositionId] = useState(seats[0]?.position?.id ?? "");
  const name = person.preferredName || person.legalName;
  return (
    <FormSheet
      title="Assign position"
      description={
        heldCount > 0
          ? `This ends the ${heldCount === 1 ? "Position" : `${heldCount} Positions`} ${name} holds today and starts the new one today.`
          : `${name} starts in the new Position today.`
      }
      onClose={onClose}
      submitLabel={seats.length > 0 ? "Assign position" : undefined}
      submitDisabled={!positionId}
      onSubmit={() => {
        if (!positionId) return;
        onAssign(positionId);
        onClose();
      }}
    >
      {seats.length === 0 ? (
        <Callout>Every Position is filled. Add a Position in Organization first, then assign it here.</Callout>
      ) : (
        <Field label="Position" hint="Only empty Positions are listed. Grade comes with the Position.">
          <Select value={positionId} onChange={(event) => setPositionId(event.target.value)}>
            {seats.map((seat) => (
              <option key={seat.position?.id} value={seat.position?.id}>
                {[seat.position?.title, seat.orgUnit?.name, seat.gradeName].filter(Boolean).join(" · ")}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </FormSheet>
  );
}

/** HR starts a Person and their Employment. Positions are assigned from the profile afterwards. */
export function CreatePersonSheet({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: CreatePersonInput) => string | null;
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
  const [error, setError] = useState("");

  return (
    <FormSheet
      title="Add person"
      description="A draft hire joins the active roster once you confirm the hire on their profile."
      onClose={onClose}
      submitLabel="Add person"
      submitDisabled={!legalName.trim() || !email.trim() || !joinDate}
      onSubmit={() => {
        const message = onCreate({
          legalName: legalName.trim(),
          preferredName: preferredName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          emergencyContactName: emergencyContactName.trim(),
          emergencyContactPhone: emergencyContactPhone.trim(),
          joinDate,
          contractType,
          status,
        });
        if (message) setError(plainPeopleError(message));
      }}
    >
      <Field label="Legal name" hint="As on their ID. Only HR can change it later.">
        <Input required value={legalName} onChange={(event) => setLegalName(event.target.value)} />
      </Field>
      <Field label="Preferred name" hint="Blank uses the legal name.">
        <Input value={preferredName} onChange={(event) => setPreferredName(event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email">
          <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Phone">
          <Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emergency contact">
          <Input value={emergencyContactName} onChange={(event) => setEmergencyContactName(event.target.value)} />
        </Field>
        <Field label="Emergency phone">
          <Input type="tel" value={emergencyContactPhone} onChange={(event) => setEmergencyContactPhone(event.target.value)} />
        </Field>
      </div>
      <Field label="Join date">
        <Input type="date" required value={joinDate} onChange={(event) => setJoinDate(event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
      {error ? <Callout tone="danger">{error}</Callout> : null}
    </FormSheet>
  );
}
