"use client";

import { useState } from "react";
import { Badge } from "@/components/coss/badge";
import { Button } from "@/components/coss/button";
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from "@/components/coss/card";
import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/coss/dialog";
import { Field, FieldLabel } from "@/components/coss/field";
import { Input } from "@/components/coss/input";
import { ScrollArea } from "@/components/coss/scroll-area";
import { Separator } from "@/components/coss/separator";
import { Sheet, SheetHeader, SheetPanel, SheetPopup, SheetTitle, SheetTrigger } from "@/components/coss/sheet";
import { Spinner } from "@/components/coss/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/coss/table";
import { Textarea } from "@/components/coss/textarea";
import { ChoiceSelect } from "@/components/product/ChoiceSelect";
import { Callout } from "@/components/product/Card";
import { StatGauge } from "@/components/product/StatGauge";
import { StatusBadge } from "@/components/product/StatusBadge";
import { ActionsCluster, DataCluster, FeedbackCluster, FormsCluster, NavigationCluster, OverlaysCluster } from "@/app/design-system/catalog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/coss/empty";

const swatches = [
  ["Canvas", "bg-bg", "#FAFAFA"],
  ["Paper", "bg-paper", "#FFFFFF"],
  ["Ink", "bg-ink", "#222222"],
  ["Muted text", "bg-muted", "#5E5E5E"],
  ["Sage", "bg-primary", "#1A7870"],
  ["Sage hover", "bg-accent-hover", "#145F59"],
  ["Tint", "bg-tint", "#EDFFFE"],
  ["Line", "bg-line", "#DEDEDE"],
  ["Line strong", "bg-line-strong", "#949494"],
  ["Success", "bg-success", "#12A864"],
  ["Warning", "bg-warning", "#C9891A"],
  ["Danger", "bg-danger", "#C4353A"],
  ["Info", "bg-info", "#0673C0"],
] as const;

const roles = [
  { value: "employee", label: "Employee" },
  { value: "line-manager", label: "Line Manager" },
  { value: "admin", label: "Admin" },
];

const groups = [
  ["foundations", "Foundations"],
  ["actions", "Actions"],
  ["forms", "Forms"],
  ["navigation", "Navigation"],
  ["feedback", "Feedback"],
  ["overlays", "Overlays"],
  ["data", "Data"],
  ["product", "Product"],
] as const;

type Group = (typeof groups)[number][0];

export default function DesignSystemPage() {
  const [role, setRole] = useState("employee");
  const [group, setGroup] = useState<Group>("foundations");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <header>
        <h1 className="m-0 font-heading text-h1 font-medium">Design system</h1>
        <p className="mt-2 mb-0 max-w-[62ch] text-muted-foreground">
          Sage coss-ui primitives for KMPlus People. Pick a group. This page is not in the sidebar.
        </p>
      </header>

      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav aria-label="Component groups" className="flex shrink-0 gap-2 overflow-x-auto md:sticky md:top-0 md:w-44 md:flex-col">
          {groups.map(([id, label]) => (
            <Button
              key={id}
              type="button"
              variant={group === id ? "secondary" : "ghost"}
              aria-current={group === id ? "page" : undefined}
              className="shrink-0 justify-start"
              onClick={() => setGroup(id)}
            >
              {label}
            </Button>
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-8">
          {group === "foundations" ? (
          <>
      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Type</h2>
        <p className="m-0 font-heading text-h1 font-medium">Plus Jakarta Sans heading</p>
        <p className="m-0 max-w-[62ch] text-base text-foreground">
          Body copy uses Plus Jakarta Sans. A person, a position, and a KPI portfolio should be readable at a glance.
        </p>
        <p className="m-0 font-mono text-xs uppercase tracking-[0.06em] text-faint">IBM Plex Mono caption</p>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Color</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {swatches.map(([name, wash, hex]) => (
            <div key={name} className="rounded-2xl border border-border bg-card p-3">
              <div className={`mb-2 h-12 rounded-md border border-border ${wash}`} />
              <p className="m-0 text-sm font-medium">{name}</p>
              <p className="m-0 font-mono text-xs text-faint">{hex}</p>
            </div>
          ))}
        </div>
      </section>
          </>
          ) : null}

          {group === "actions" ? (
          <>
      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button type="button">Sage</Button>
          <Button type="button" variant="outline">Outline</Button>
          <Button type="button" variant="secondary">Secondary</Button>
          <Button type="button" variant="ghost">Ghost</Button>
          <Button type="button" variant="destructive">Destructive</Button>
          <Button type="button" disabled>Disabled</Button>
          <Button type="button" loading>Saving</Button>
        </div>
        <p className="m-0 text-sm text-muted-foreground">
          The old primary button is this sage default. The old secondary button is outline. The old danger button is destructive.
        </p>
      </section>
      <ActionsCluster />
          </>
          ) : null}

          {group === "forms" ? (
          <>
      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Fields</h2>
        <div className="grid max-w-md gap-4">
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input type="email" placeholder="name@kmplus.co.id" />
          </Field>
          <Field>
            <FieldLabel>Note</FieldLabel>
            <Textarea placeholder="What changed since the last check-in?" />
          </Field>
          <Field>
            <FieldLabel>Role</FieldLabel>
            <ChoiceSelect value={role} onValueChange={setRole} items={roles} />
          </Field>
        </div>
      </section>
      <FormsCluster />
          </>
          ) : null}

          {group === "feedback" ? (
          <>
      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline">neutral</Badge>
          <Badge variant="secondary">in-review</Badge>
          <Badge variant="success">agreed</Badge>
          <Badge variant="warning">returned</Badge>
          <Badge variant="error">rejected</Badge>
        </div>
      </section>
      <FeedbackCluster />
      <Card>
        <Empty className="py-8">
          <EmptyHeader>
            <EmptyTitle>No KPIs yet</EmptyTitle>
            <EmptyDescription>Add the first measure, then bring the weights to 100%.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Spinner className="size-5 text-primary" />
        Saving the portfolio
      </div>
          </>
          ) : null}

          {group === "data" ? (
          <>
      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Card, callout, table</h2>
        <Card>
          <CardHeader>
            <CardTitle>KPI portfolio</CardTitle>
            <CardDescription>One paper surface for a person’s agreed measures.</CardDescription>
          </CardHeader>
          <CardPanel>
            <Callout>Weights on an agreed portfolio stay visible during monitoring.</Callout>
          </CardPanel>
        </Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Alfredo</TableCell>
              <TableCell>Employee</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Separator and scroll</h2>
        <div className="max-w-md">
          <p className="m-0 text-sm">Roster</p>
          <Separator className="my-4" />
          <p className="m-0 text-sm text-muted-foreground">A quiet rule between two groups.</p>
        </div>
        <ScrollArea className="h-40 max-w-md rounded-2xl bg-card shadow-[var(--shadow)]">
          <ul className="m-0 list-none p-4">
            {["Alfredo Teja", "Akhmad Eka", "Alvin Soleh", "Denny G", "Digit Prakitka", "Fadhylah", "Imanuella Gerlani"].map((name) => (
              <li key={name} className="border-b border-border py-2 text-sm last:border-0">
                {name}
              </li>
            ))}
          </ul>
        </ScrollArea>
      </section>
      <DataCluster />
          </>
          ) : null}

          {group === "overlays" ? (
          <>
      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Dialog and sheet</h2>
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger render={<Button type="button" variant="outline" />}>Open dialog</DialogTrigger>
            <DialogPopup>
              <DialogHeader>
                <DialogTitle>Create person</DialogTitle>
              </DialogHeader>
              <DialogPanel>
                <p className="m-0 text-sm text-muted-foreground">Focus stays in this dialog until it closes.</p>
              </DialogPanel>
            </DialogPopup>
          </Dialog>
          <Sheet>
            <SheetTrigger render={<Button type="button" variant="outline" />}>Open sheet</SheetTrigger>
            <SheetPopup>
              <SheetHeader>
                <SheetTitle>KPI portfolio</SheetTitle>
              </SheetHeader>
              <SheetPanel>
                <p className="m-0 text-sm text-muted-foreground">Detail for one portfolio opens in a floating panel.</p>
              </SheetPanel>
            </SheetPopup>
          </Sheet>
        </div>
      </section>
      <OverlaysCluster />
          </>
          ) : null}

          {group === "navigation" ? <NavigationCluster /> : null}

          {group === "product" ? (
      <section className="flex flex-col gap-6">
        <h2 className="m-0 text-h2 font-medium">Product components</h2>
        <p className="m-0 text-sm text-muted-foreground">These stay custom. They use the same sage tokens.</p>
        <div className="flex flex-wrap items-start gap-4">
          <StatGauge label="On track" value="4" percent={0.66} tone="accent" target="6 agreed portfolios" detail="Check-ins look healthy." />
          <div className="flex flex-col gap-2 pt-2">
            <StatusBadge status="in-review" />
            <StatusBadge status="agreed" />
            <StatusBadge status="returned" />
          </div>
        </div>
      </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
