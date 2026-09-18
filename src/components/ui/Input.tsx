import { cn } from "@/lib/cn";
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

const fieldClass =
  "h-[38px] rounded-[12px] border-[1.5px] border-line bg-paper px-3 text-sm text-ink outline-none focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "w-full", className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, "w-full", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldClass, "h-24 w-full py-2", className)}
      {...props}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-[12px] font-medium uppercase tracking-[0.06em] text-faint">
      {children}
    </label>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const generatedId = useId();
  const child = Children.only(children);
  const control = isValidElement<{ id?: string }>(child)
    ? cloneElement(child as ReactElement<{ id?: string }>, { id: child.props.id ?? generatedId })
    : child;
  const htmlFor = isValidElement<{ id?: string }>(control) ? control.props.id : generatedId;
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {control}
    </div>
  );
}
