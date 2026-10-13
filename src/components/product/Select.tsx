"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { ChoiceSelect, type Choice } from "@/components/product/ChoiceSelect";

function collectChoices(children: ReactNode, into: Choice[]) {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode }>(child)) return;
    if (child.type === "optgroup") {
      collectChoices(child.props.children, into);
      return;
    }
    if (child.type !== "option") return;
    const raw = child.props.value;
    const itemValue = raw == null ? "" : String(raw);
    const labelNode = child.props.children;
    const label = typeof labelNode === "string" || typeof labelNode === "number" ? String(labelNode) : itemValue;
    into.push({ value: itemValue, label });
  });
}

export function Select({
  value,
  onChange,
  children,
  disabled,
  id,
  className,
  required,
}: {
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  children?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  required?: boolean;
}) {
  const items: Choice[] = [];
  collectChoices(children, items);
  const current = value ?? "";

  return (
    <>
      {required ? (
        <input className="sr-only" tabIndex={-1} aria-hidden required value={current} onChange={() => undefined} />
      ) : null}
      <ChoiceSelect
        id={id}
        className={className}
        disabled={disabled}
        items={items}
        value={current}
        onValueChange={(next) => onChange?.({ target: { value: next } })}
      />
    </>
  );
}
