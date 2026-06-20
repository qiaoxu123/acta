import clsx from "clsx";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";

type Variant = "primary" | "default" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-fg border-transparent hover:opacity-90",
  default:
    "bg-surface-raised text-content border-border hover:bg-surface-sunken",
  ghost:
    "bg-transparent text-content-muted border-transparent hover:bg-surface-sunken",
  danger:
    "bg-transparent text-urgent border-transparent hover:bg-accent-soft",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }
>(function Button({ variant = "default", className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
});

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-2xs font-semibold uppercase tracking-wide text-content-subtle">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-2xs text-content-subtle">{hint}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-content placeholder:text-content-subtle focus:border-accent focus:outline-none";

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={clsx(inputBase, className)} {...props} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(inputBase, "resize-y leading-relaxed", className)}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={clsx(inputBase, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
});
