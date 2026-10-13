"use client";

import { Button } from "@/components/coss/button";
import { PeopleSubnav } from "@/components/people/PeopleSubnav";
import { Fact, PanelGroup, PanelNote, PanelRow, PanelRows, ProfilePanel } from "@/components/people/parts";
import {
  AssignPositionSheet,
  ContactSheet,
  CorrectionSheet,
  correctionFieldLabel,
  LoginEmailSheet,
} from "@/components/people/PersonSheets";
import { Callout } from "@/components/product/Card";
import { ConfirmAction } from "@/components/product/ConfirmAction";
import { StatusBadge } from "@/components/product/StatusBadge";
import { CodeChip, EmptyBlock, PersonAvatar } from "@/components/work-delivery/project/parts";
import { canReadPerson, employmentFor, isHrLike, todayIso } from "@/lib/domain";
import { canAccessKpiAdmin, lineManagerPersonId } from "@/lib/domain-query";
import { formatDate, formatDateRange, formatDay, plural, statusLabel } from "@/lib/labels";
import {
  currentSeats,
  cvDates,
  openSeats,
  plainPeopleError,
  portfolioStatuses,
  profileCounts,
  seatFor,
  seatLine,
  staffingRows,
  timeRows,
} from "@/lib/people-view";
import { useStore } from "@/lib/store";
import { hoursText } from "@/lib/timesheet-grid";
import { jakartaTodayIso } from "@/lib/work-delivery-query";
import { FileTextIcon, LinkIcon, MailIcon, MessageSquareWarningIcon, PencilIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";

const CONTRACT_LABELS: Record<string, string> = { permanent: "Permanent", contract: "Contract", intern: "Intern" };

const KIND_LABELS: Record<string, string> = {
  work: "Work",
  organization: "Organization",
  volunteer: "Volunteer",
  technical: "Technical",
  language: "Language",
  personal: "Personal",
};

const kindLabel = (kind: string) => KIND_LABELS[kind] ?? statusLabel(kind);

/** How many time entries show before "Show all". */
const TIME_PREVIEW = 8;

type Open = "contact" | "correction" | "login" | "assign" | null;
type Notice = { tone: "accent" | "danger"; text: string } | null;

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
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [allTime, setAllTime] = useState(false);
  const person = state.people.find((row) => row.id === params.id);

  if (!person || !canReadPerson(state, person.id)) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <PeopleSubnav className="mb-0" />
        <h1 className="m-0 font-heading text-h1 font-medium">Profile</h1>
        <Callout tone="warning">
          You don&apos;t have access to this profile.{" "}
          <Link href="/people" className="font-medium text-accent underline-offset-2 hover:underline">
            Back to People
          </Link>
        </Callout>
      </div>
    );
  }

  const today = jakartaTodayIso();
  const hr = isHrLike(state.currentRole);
  const isSelf = state.currentPersonId === person.id;
  const canSetLoginEmail = state.currentRole === "hr";
  const canManageAdminGrant = state.currentRole === "hr" || canAccessKpiAdmin(state);
  const canEditContact = isSelf || canAccessKpiAdmin(state);
  const canRequestCorrection = isSelf && !hr;
  const loginUser = state.users.find((row) => row.personId === person.id);

  const employment = employmentFor(state, person.id);
  const seats = currentSeats(state, person.id);
  const roleLine = seatLine(seats);
  const managerId = lineManagerPersonId(state, person.id);
  const manager = managerId ? state.people.find((row) => row.id === managerId) : undefined;
  const history = state.assignments
    .filter((row) => row.personId === person.id)
    .sort((left, right) => right.startDate.localeCompare(left.startDate))
    .map((row) => seatFor(state, row));
  const corrections = state.corrections.filter((row) => row.personId === person.id);
  const openCorrections = corrections.filter((row) => row.status === "open");
  const counts = profileCounts(state, person.id, today);
  const portfolio = portfolioStatuses(state, person.id);
  const staffing = staffingRows(state, person.id, today);
  const time = timeRows(state, person.id);
  const shownTime = allTime ? time : time.slice(0, TIME_PREVIEW);
  const evidenceCount =
    person.educations.length + person.experiences.length + person.certificationRows.length + person.skillRows.length;
  const skillGroups = (["technical", "language", "personal"] as const)
    .map((kind) => ({ kind, names: person.skillRows.filter((row) => row.kind === kind).map((row) => row.name) }))
    .filter((group) => group.names.length > 0);
  const workEmail = loginUser?.email ?? person.email;
  const displayName = person.preferredName || person.legalName;

  function changeAdmin(grant: boolean) {
    if (!person) return;
    const error = grant ? grantAdmin(person.id) : revokeAdmin(person.id);
    setNotice(
      error
        ? { tone: "danger", text: plainPeopleError(error) }
        : { tone: "accent", text: grant ? `${displayName} now has Admin access.` : `${displayName} no longer has Admin access.` },
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PeopleSubnav className="mb-0" />

      {/* The devl.dev Profile card: avatar, name, one role line, contact facts, a few counts, the viewer's actions. */}
      <section aria-labelledby="person-name" className="overflow-clip rounded-2xl bg-paper shadow-(--shadow)">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:gap-5 sm:px-6">
          <PersonAvatar person={person} className="size-16 text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 id="person-name" className="m-0 font-heading text-h1 font-medium text-balance">
                {person.legalName}
              </h1>
              {employment ? <StatusBadge status={employment.status} /> : null}
            </div>
            <p className="mt-1 mb-0 text-muted">
              {roleLine || "No Position yet"}
              {person.preferredName && person.preferredName !== person.legalName ? ` · Goes by ${person.preferredName}` : ""}
            </p>
            <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0 text-sm">
              <ContactFact icon={<MailIcon />} label={loginUser ? "Work login email" : "Contact email"}>
                <a href={`mailto:${workEmail}`} className="break-all text-ink no-underline hover:text-accent hover:underline">
                  {workEmail}
                </a>
              </ContactFact>
              <ContactFact icon={<PhoneIcon />} label="Phone">
                {person.phone ? (
                  <a href={`tel:${person.phone}`} className="text-ink no-underline tabular-nums hover:text-accent hover:underline">
                    {person.phone}
                  </a>
                ) : (
                  <span className="text-faint">No phone</span>
                )}
              </ContactFact>
              {person.linkedIn ? (
                <ContactFact icon={<LinkIcon />} label="LinkedIn">
                  <a
                    href={person.linkedIn.startsWith("http") ? person.linkedIn : `https://${person.linkedIn}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-ink no-underline hover:text-accent hover:underline"
                  >
                    LinkedIn
                  </a>
                </ContactFact>
              ) : null}
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 border-t border-line px-5 py-4 sm:px-6">
          <dl className="m-0 flex flex-wrap gap-x-8 gap-y-3">
            <Count label="Projects today">{counts.projectsToday}</Count>
            <Count label="Hours this month">{hoursText(counts.monthHours)}</Count>
            {portfolio ? (
              <Count label={`KPI Portfolio ${portfolio.year}`}>
                {portfolio.rows.length === 0 ? (
                  <span className="text-sm font-normal text-faint">Not started</span>
                ) : (
                  <span className="flex flex-wrap items-center gap-1.5">
                    {portfolio.rows.map((row) => (
                      <span key={row.assignmentId} title={row.positionTitle} className="inline-flex">
                        <StatusBadge status={row.status} />
                      </span>
                    ))}
                  </span>
                )}
              </Count>
            ) : null}
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen("contact")}>
              {canEditContact ? <PencilIcon aria-hidden="true" /> : null}
              {canEditContact ? "Edit contact details" : "Contact details"}
            </Button>
            {canRequestCorrection ? (
              <Button type="button" variant="outline" onClick={() => setOpen("correction")}>
                <MessageSquareWarningIcon aria-hidden="true" />
                Request a correction
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      {notice ? (
        <Callout tone={notice.tone} live={notice.tone === "danger" ? "alert" : "status"}>
          {notice.text}
        </Callout>
      ) : null}

      {(hr || isSelf) && corrections.length > 0 ? (
        <ProfilePanel id="corrections-heading" title={hr ? "Correction requests" : "Your correction requests"} count={corrections.length}>
          <ul className="m-0 list-none p-0">
            {corrections.map((row) => (
              <PanelRow key={row.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={row.status} />
                  <span className="min-w-0 break-words">
                    <span className="font-medium">{correctionFieldLabel(row.field)}</span>: {row.currentValue || "Not set"} →{" "}
                    {row.proposedValue}
                  </span>
                </div>
                {hr && row.status === "open" ? (
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
              </PanelRow>
            ))}
          </ul>
          {hr && openCorrections.length > 0 ? (
            <p className="m-0 border-t border-line px-5 py-3 text-sm text-muted">
              {plural(openCorrections.length, "open request")} {openCorrections.length === 1 ? "needs" : "need"} a decision.
            </p>
          ) : null}
        </ProfilePanel>
      ) : null}

      <ProfilePanel
        id="employment-heading"
        title="Employment and seats"
        action={
          hr ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen("assign")}>
              Assign position
            </Button>
          ) : null
        }
      >
        {hr && employment?.status === "draft-hire" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-tint px-5 py-3.5">
            <p className="m-0 max-w-[65ch] text-sm">
              This person is a draft hire. They join the active roster once you confirm the hire.
            </p>
            <Button type="button" size="sm" onClick={() => confirmHire(person.id)}>
              Confirm hire
            </Button>
          </div>
        ) : null}
        {employment ? (
          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4 @2xl:grid-cols-3">
            <Fact label="Contract">{CONTRACT_LABELS[employment.contractType] ?? statusLabel(employment.contractType)}</Fact>
            <Fact label="Join date">{formatDate(employment.joinDate)}</Fact>
            <Fact label="Line Manager">
              {manager ? (
                canReadPerson(state, manager.id) ? (
                  <Link href={`/people/${manager.id}`} className="text-accent no-underline hover:underline">
                    {manager.legalName}
                  </Link>
                ) : (
                  manager.legalName
                )
              ) : (
                <span className="text-faint">None</span>
              )}
            </Fact>
          </dl>
        ) : (
          <PanelNote>No employment record yet.</PanelNote>
        )}
        <PanelGroup title={seats.length > 1 ? `Holds ${seats.length} Positions at the same time` : "Current Position"}>
          {seats.length === 0 ? (
            <PanelNote>{hr ? "No Position yet. Assign an empty Position to seat them." : "No Position yet."}</PanelNote>
          ) : (
            <PanelRows>
              {seats.map((seat) => (
                <PanelRow key={seat.assignment.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                  <span className="min-w-0">
                    <span className="block font-medium">{seat.position?.title ?? "Unknown Position"}</span>
                    <span className="block text-sm text-muted">
                      {[seat.orgUnit?.name, seat.gradeName].filter(Boolean).join(" · ") || "No OrgUnit"}
                    </span>
                  </span>
                  <span className="text-sm text-muted tabular-nums">Since {formatDate(seat.assignment.startDate)}</span>
                </PanelRow>
              ))}
            </PanelRows>
          )}
        </PanelGroup>
        {canSetLoginEmail || loginUser ? (
          <PanelGroup title="Sign-in and Admin access">
            <PanelRows>
              <PanelRow className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <span className="min-w-0 text-sm break-words">
                  {loginUser ? (
                    <>
                      Signs in with <span className="font-medium">{loginUser.email}</span>
                    </>
                  ) : (
                    <span className="text-muted">No login yet. They can&apos;t sign in until HR creates one.</span>
                  )}
                </span>
                {canSetLoginEmail ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen("login")}>
                    {loginUser ? "Change login email" : "Create login"}
                  </Button>
                ) : null}
              </PanelRow>
              {canManageAdminGrant && loginUser ? (
                <PanelRow className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <span className="min-w-0 text-sm">
                    {loginUser.adminGrant
                      ? "Has Admin access, in addition to their usual role."
                      : "No Admin access. Admin access adds to their usual role."}
                  </span>
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
                      onConfirm={() => changeAdmin(false)}
                    />
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={() => changeAdmin(true)}>
                      Give Admin access
                    </Button>
                  )}
                </PanelRow>
              ) : null}
            </PanelRows>
          </PanelGroup>
        ) : null}
      </ProfilePanel>

      <ProfilePanel
        id="evidence-heading"
        title="CV evidence"
        count={evidenceCount}
        action={
          hr && evidenceCount > 0 ? (
            <Button variant="ghost" size="sm" className="text-accent" render={<Link href="/cv" />}>
              Open CV review
            </Button>
          ) : null
        }
      >
        {evidenceCount === 0 ? (
          <EmptyBlock
            className="py-8"
            icon={<FileTextIcon aria-hidden="true" />}
            title="No reviewed CV yet"
            description="Education, experience, certifications, and skills appear here once HR reviews a CV for this person."
            action={
              hr ? (
                <Button variant="outline" render={<Link href="/cv" />}>
                  Open CV review
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <PanelGroup title="Education" count={person.educations.length}>
              {person.educations.length === 0 ? (
                <PanelNote>None reviewed yet.</PanelNote>
              ) : (
                <PanelRows>
                  {person.educations.map((row, index) => (
                    <PanelRow key={`${row.institution}-${index}`}>
                      <span className="block font-medium">{row.institution}</span>
                      <span className="block text-sm text-muted">
                        {[row.credential, cvDates(row.startDate, row.endDate), row.gpa ? `GPA ${row.gpa}` : ""].filter(Boolean).join(" · ")}
                      </span>
                    </PanelRow>
                  ))}
                </PanelRows>
              )}
            </PanelGroup>
            <PanelGroup title="Experience" count={person.experiences.length}>
              {person.experiences.length === 0 ? (
                <PanelNote>None reviewed yet.</PanelNote>
              ) : (
                <PanelRows>
                  {person.experiences.map((row, index) => (
                    <PanelRow key={`${row.organization}-${row.title}-${index}`}>
                      <span className="block font-medium">
                        {row.title}
                        {row.organization ? <span className="font-normal text-muted"> at {row.organization}</span> : null}
                      </span>
                      <span className="block text-sm text-muted">
                        {kindLabel(row.kind)} · {cvDates(row.startDate, row.endDate)}
                      </span>
                      {row.narrative ? <p className="mt-1 mb-0 max-w-[70ch] text-sm">{row.narrative}</p> : null}
                    </PanelRow>
                  ))}
                </PanelRows>
              )}
            </PanelGroup>
            <PanelGroup title="Certifications" count={person.certificationRows.length}>
              {person.certificationRows.length === 0 ? (
                <PanelNote>None reviewed yet.</PanelNote>
              ) : (
                <PanelRows>
                  {person.certificationRows.map((row, index) => (
                    <PanelRow key={`${row.name}-${index}`}>
                      <span className="block font-medium">{row.name}</span>
                      <span className="block text-sm text-muted">
                        {[row.issuer, row.date ? formatDate(row.date) : "No date"].filter(Boolean).join(" · ")}
                      </span>
                    </PanelRow>
                  ))}
                </PanelRows>
              )}
            </PanelGroup>
            <PanelGroup title="Skills" count={person.skillRows.length}>
              {skillGroups.length === 0 ? (
                <PanelNote>None reviewed yet.</PanelNote>
              ) : (
                <PanelRows>
                  {skillGroups.map((group) => (
                    <PanelRow key={group.kind} className="grid gap-x-4 gap-y-0.5 @lg:grid-cols-[7rem_minmax(0,1fr)]">
                      <span className="text-sm text-muted">{kindLabel(group.kind)}</span>
                      <span className="text-sm">{group.names.join(", ")}</span>
                    </PanelRow>
                  ))}
                </PanelRows>
              )}
            </PanelGroup>
          </>
        )}
      </ProfilePanel>

      <ProfilePanel
        id="work-heading"
        title="Projects and time"
        action={
          isSelf ? (
            <>
              <Button variant="ghost" size="sm" className="text-accent" render={<Link href="/timesheet" />}>
                Open timesheet
              </Button>
              <Button variant="ghost" size="sm" className="text-accent" render={<Link href="/leave/file" />}>
                File leave
              </Button>
            </>
          ) : null
        }
      >
        <PanelGroup title="Projects" count={staffing.length}>
          {staffing.length === 0 ? (
            <PanelNote>Not on any project.</PanelNote>
          ) : (
            <PanelRows>
              {staffing.map(({ staffing: row, project, when }) => (
                <PanelRow key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <CodeChip code={project?.code ?? "?"} className="shrink-0" />
                    <Link
                      href={`/projects/${row.projectId}`}
                      className={`truncate font-medium no-underline hover:text-accent hover:underline ${when === "ended" ? "text-muted" : "text-ink"}`}
                    >
                      {project?.name ?? "Unknown project"}
                    </Link>
                  </span>
                  <span className="text-sm tabular-nums">{row.load}%</span>
                  <span className="col-span-2 text-sm text-muted tabular-nums">
                    {formatDateRange(row.startDate, row.endDate)}
                    {when === "upcoming" ? " · Starts later" : when === "ended" ? " · Finished" : ""}
                  </span>
                </PanelRow>
              ))}
            </PanelRows>
          )}
        </PanelGroup>
        <PanelGroup title="Time logged" count={time.length}>
          {time.length === 0 ? (
            <PanelNote>No time logged yet.</PanelNote>
          ) : (
            <>
              <PanelRows>
                {shownTime.map(({ block, hours, project, typeName, accepted }) => (
                  <PanelRow
                    key={block.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 @2xl:grid-cols-[9rem_minmax(0,1fr)_auto]"
                  >
                    <span className="text-sm tabular-nums @max-2xl:col-span-2 @max-2xl:text-muted">
                      {formatDay(block.startAt.slice(0, 10))} · {block.startAt.slice(11, 16)}–{block.endAt.slice(11, 16)}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      {project ? <CodeChip code={project.code} className="shrink-0" /> : null}
                      <span className="truncate">
                        {block.title || typeName || "Time block"}
                        {accepted ? <span className="text-muted"> · Accepted meeting</span> : null}
                        {block.title && typeName ? <span className="text-muted"> · {typeName}</span> : null}
                      </span>
                    </span>
                    <span className="text-sm font-medium tabular-nums">{hoursText(hours)}</span>
                  </PanelRow>
                ))}
              </PanelRows>
              {time.length > TIME_PREVIEW ? (
                <div className="border-t border-line px-5 py-2.5">
                  <Button type="button" variant="ghost" size="sm" className="text-accent" onClick={() => setAllTime((value) => !value)}>
                    {allTime ? "Show the latest only" : `Show all ${time.length} entries`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </PanelGroup>
      </ProfilePanel>

      <ProfilePanel id="history-heading" title="Assignment history" count={history.length}>
        {history.length === 0 ? (
          <PanelNote>No Positions yet.</PanelNote>
        ) : (
          <PanelRows>
            {history.map((seat) => (
              <PanelRow key={seat.assignment.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                <span className="min-w-0">
                  <span className="block font-medium">{seat.position?.title ?? "Unknown Position"}</span>
                  <span className="block text-sm text-muted">
                    {[seat.orgUnit?.name, seat.gradeName].filter(Boolean).join(" · ") || "No OrgUnit"}
                  </span>
                </span>
                <span className="text-sm tabular-nums">
                  {seat.assignment.endDate ? (
                    <span className="text-muted">{formatDateRange(seat.assignment.startDate, seat.assignment.endDate)}</span>
                  ) : (
                    <>
                      <span className="text-muted">{formatDateRange(seat.assignment.startDate, null)}</span>
                      <span className="font-medium text-accent-hover"> · Current</span>
                    </>
                  )}
                </span>
              </PanelRow>
            ))}
          </PanelRows>
        )}
      </ProfilePanel>

      {open === "contact" ? (
        <ContactSheet
          person={person}
          canEdit={canEditContact}
          onClose={() => setOpen(null)}
          onSave={(patch) => {
            const error = updatePersonContact(person.id, patch).error;
            if (!error) setNotice({ tone: "accent", text: "Contact details saved." });
            return error;
          }}
        />
      ) : null}
      {open === "correction" && canRequestCorrection ? (
        <CorrectionSheet
          person={person}
          requests={corrections}
          onClose={() => setOpen(null)}
          onSend={(field, currentValue, proposedValue) => {
            requestCorrection(person.id, field, currentValue, proposedValue);
            setNotice({ tone: "accent", text: `Sent to HR. Your ${correctionFieldLabel(field).toLowerCase()} changes once HR accepts it.` });
          }}
        />
      ) : null}
      {open === "login" && canSetLoginEmail ? (
        <LoginEmailSheet person={person} loginEmail={loginUser?.email ?? null} onClose={() => setOpen(null)} />
      ) : null}
      {open === "assign" && hr ? (
        <AssignPositionSheet
          person={person}
          seats={openSeats(state)}
          heldCount={seats.length}
          onClose={() => setOpen(null)}
          onAssign={(positionId) => {
            assignPosition(person.id, positionId, todayIso());
            setNotice({ tone: "accent", text: `${displayName} is assigned to the new Position from today.` });
          }}
        />
      ) : null}
    </div>
  );
}

function ContactFact({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <span aria-hidden="true" className="text-faint [&_svg]:size-4">
        {icon}
      </span>
      <span className="sr-only">{label}: </span>
      {children}
    </li>
  );
}

function Count({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-label text-muted">{label}</dt>
      <dd className="m-0 flex min-h-6 items-center text-base font-medium tabular-nums">{children}</dd>
    </div>
  );
}
