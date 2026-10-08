"use client";

import type { ReactNode } from "react";

import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from "@/components/coss/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/coss/alert";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/coss/alert-dialog";
import { Autocomplete, AutocompleteInput, AutocompleteItem, AutocompleteList, AutocompletePopup } from "@/components/coss/autocomplete";
import { Avatar, AvatarFallback } from "@/components/coss/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/coss/breadcrumb";
import { Button } from "@/components/coss/button";
import { Calendar } from "@/components/coss/calendar";
import { Checkbox } from "@/components/coss/checkbox";
import { CheckboxGroup } from "@/components/coss/checkbox-group";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/coss/collapsible";
import { Combobox, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "@/components/coss/combobox";
import { Drawer, DrawerDescription, DrawerHeader, DrawerPanel, DrawerPopup, DrawerTitle, DrawerTrigger } from "@/components/coss/drawer";
import { Field, FieldLabel } from "@/components/coss/field";
import { Fieldset, FieldsetLegend } from "@/components/coss/fieldset";
import { Frame, FramePanel, FrameTitle } from "@/components/coss/frame";
import { Group, GroupSeparator } from "@/components/coss/group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/coss/input-group";
import { Kbd } from "@/components/coss/kbd";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/coss/menu";
import { Meter, MeterLabel, MeterValue } from "@/components/coss/meter";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "@/components/coss/number-field";
import { OTPField, OTPFieldInput, OTPFieldSeparator } from "@/components/coss/otp-field";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/coss/pagination";
import { Popover, PopoverDescription, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/coss/popover";
import { PreviewCard, PreviewCardPopup, PreviewCardTrigger } from "@/components/coss/preview-card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/coss/progress";
import { Radio, RadioGroup } from "@/components/coss/radio-group";
import { Skeleton } from "@/components/coss/skeleton";
import { Slider } from "@/components/coss/slider";
import { Switch } from "@/components/coss/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/coss/tabs";
import { ToastProvider, toastManager } from "@/components/coss/toast";
import { Toggle } from "@/components/coss/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/coss/toggle-group";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "@/components/coss/toolbar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/coss/tooltip";

const people = ["Alfredo", "Akhmad", "Alvin"];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="m-0 text-[22px] font-medium">{title}</h2>
      {children}
    </section>
  );
}

export function FormsCluster() {
  return (
    <div className="flex flex-col gap-10">
      <Block title="Choice controls">
        <div className="grid max-w-md gap-4">
          <Field>
            <FieldLabel>Notify on check-in</FieldLabel>
            <Checkbox />
          </Field>
          <CheckboxGroup aria-label="Employment" className="flex gap-4">
            <Field>
              <FieldLabel>Active</FieldLabel>
              <Checkbox value="active" />
            </Field>
          </CheckboxGroup>
          <Field>
            <FieldLabel>Cascade</FieldLabel>
            <RadioGroup defaultValue="indirect" aria-label="Cascade">
              <Field>
                <Radio value="indirect" />
                <FieldLabel>Indirect</FieldLabel>
              </Field>
              <Field>
                <Radio value="direct" />
                <FieldLabel>Direct</FieldLabel>
              </Field>
            </RadioGroup>
          </Field>
          <Field>
            <FieldLabel>Monitoring</FieldLabel>
            <Switch defaultChecked aria-label="Monitoring" />
          </Field>
          <Field>
            <FieldLabel>Weight</FieldLabel>
            <Slider defaultValue={40} aria-label="Weight" />
          </Field>
          <NumberField defaultValue={1} min={0}>
            <NumberFieldGroup>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldGroup>
          </NumberField>
          <OTPField aria-label="One-time code" length={4}>
            <OTPFieldInput />
            <OTPFieldInput />
            <OTPFieldSeparator />
            <OTPFieldInput />
            <OTPFieldInput />
          </OTPField>
        </div>
        <Fieldset className="max-w-md">
          <FieldsetLegend>Search</FieldsetLegend>
          <Autocomplete items={people}>
            <AutocompleteInput placeholder="Find a person" />
            <AutocompletePopup>
              <AutocompleteList>
                {(item: string) => (
                  <AutocompleteItem key={item} value={item}>
                    {item}
                  </AutocompleteItem>
                )}
              </AutocompleteList>
            </AutocompletePopup>
          </Autocomplete>
          <Combobox items={people}>
            <ComboboxInput placeholder="Filter a role" />
            <ComboboxPopup>
              <ComboboxList>
                {(item: string) => (
                  <ComboboxItem key={item} value={item}>
                    {item}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
        </Fieldset>
        <InputGroup className="max-w-md">
          <InputGroupInput placeholder="Search the roster" />
          <InputGroupAddon>People</InputGroupAddon>
        </InputGroup>
      </Block>
    </div>
  );
}

export function NavigationCluster() {
  return (
    <div className="flex flex-col gap-10">
      <Block title="Navigation and disclosure">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/people">People</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Alfredo Teja</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <Tabs defaultValue="roster">
          <TabsList>
            <TabsTab value="roster">Roster</TabsTab>
            <TabsTab value="review">CV review</TabsTab>
          </TabsList>
          <TabsPanel value="roster">People on the active roster.</TabsPanel>
          <TabsPanel value="review">CVs waiting for HR.</TabsPanel>
        </Tabs>
        <Accordion>
          <AccordionItem value="planning">
            <AccordionTrigger>Planning</AccordionTrigger>
            <AccordionPanel>Draft the portfolio before monitoring starts.</AccordionPanel>
          </AccordionItem>
        </Accordion>
        <Collapsible>
          <CollapsibleTrigger className="text-sm font-medium">Show the audit note</CollapsibleTrigger>
          <CollapsiblePanel className="pt-2 text-sm text-muted-foreground">
            The last eight changes stay secondary to the work queue.
          </CollapsiblePanel>
        </Collapsible>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="/people" />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href="/people" isActive>
                1
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="/people" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </Block>
    </div>
  );
}

export function FeedbackCluster() {
  return (
    <div className="flex flex-col gap-10">
      <Block title="Status">
        <Alert>
          <AlertTitle>Portfolio returned</AlertTitle>
          <AlertDescription>The line manager asked for a weight change.</AlertDescription>
        </Alert>
        <Progress value={66}>
          <ProgressLabel>Planning time</ProgressLabel>
          <ProgressValue />
        </Progress>
        <Meter value={80} min={0} max={100}>
          <MeterLabel>Weight</MeterLabel>
          <MeterValue />
        </Meter>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>AT</AvatarFallback>
          </Avatar>
          <Skeleton className="h-8 w-40" />
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>
      </Block>
    </div>
  );
}

export function OverlaysCluster() {
  return (
    <div className="flex flex-col gap-10">
      <Block title="Overlays">
        <div className="flex flex-wrap gap-3">
          <Tooltip>
            <TooltipTrigger render={<Button type="button" variant="outline" />}>Hover for help</TooltipTrigger>
            <TooltipPopup>Weights must total 100%.</TooltipPopup>
          </Tooltip>
          <Popover>
            <PopoverTrigger render={<Button type="button" variant="outline" />}>Open popover</PopoverTrigger>
            <PopoverPopup>
              <PopoverTitle>Check-in</PopoverTitle>
              <PopoverDescription>Record the latest actual.</PopoverDescription>
            </PopoverPopup>
          </Popover>
          <Menu>
            <MenuTrigger render={<Button type="button" variant="outline" />}>Open menu</MenuTrigger>
            <MenuPopup>
              <MenuItem>Agree</MenuItem>
              <MenuItem>Return</MenuItem>
            </MenuPopup>
          </Menu>
          <PreviewCard>
            <PreviewCardTrigger render={<Button type="button" variant="ghost" />}>Preview person</PreviewCardTrigger>
            <PreviewCardPopup className="w-56 p-3 text-sm">Alfredo Teja, Associate Consultant.</PreviewCardPopup>
          </PreviewCard>
          <AlertDialog>
            <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>Reject CV</AlertDialogTrigger>
            <AlertDialogPopup>
              <AlertDialogHeader>
                <AlertDialogTitle>Reject this CV?</AlertDialogTitle>
                <AlertDialogDescription>Parsed fields will not be written to the person.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogClose render={<Button type="button" variant="outline" />}>Keep it</AlertDialogClose>
              </AlertDialogFooter>
            </AlertDialogPopup>
          </AlertDialog>
          <Drawer>
            <DrawerTrigger render={<Button type="button" variant="outline" />}>Open drawer</DrawerTrigger>
            <DrawerPopup>
              <DrawerHeader>
                <DrawerTitle>Filters</DrawerTitle>
                <DrawerDescription>Narrow the roster.</DrawerDescription>
              </DrawerHeader>
              <DrawerPanel />
            </DrawerPopup>
          </Drawer>
          <ToastProvider>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                toastManager.add({
                  title: "Draft saved",
                  description: "The portfolio is still in planning.",
                })
              }
            >
              Show toast
            </Button>
          </ToastProvider>
        </div>
      </Block>
    </div>
  );
}

export function ActionsCluster() {
  return (
    <div className="flex flex-col gap-6">
      <Group className="max-w-md">
        <Button type="button" variant="outline">Agree</Button>
        <GroupSeparator />
        <Button type="button" variant="outline">Return</Button>
      </Group>
      <Toolbar className="max-w-md">
        <ToolbarButton render={<Button type="button" variant="ghost" />}>Edit</ToolbarButton>
        <ToolbarSeparator />
        <ToolbarButton render={<Button type="button" variant="ghost" />}>Remove</ToolbarButton>
      </Toolbar>
      <div className="flex flex-wrap gap-3">
        <Toggle>Pin</Toggle>
        <ToggleGroup defaultValue={["roster"]}>
          <ToggleGroupItem value="roster">Roster</ToggleGroupItem>
          <ToggleGroupItem value="review">Review</ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

export function DataCluster() {
  return (
    <Frame className="max-w-md">
      <FrameTitle>Calendar</FrameTitle>
      <FramePanel>
        <Calendar />
      </FramePanel>
    </Frame>
  );
}
