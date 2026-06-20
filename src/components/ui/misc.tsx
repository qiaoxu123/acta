import clsx from "clsx";
import type { ReactNode } from "react";
import { countdown, type Urgency } from "@/lib/dates";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "urgent" | "warn" | "ok";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-sunken text-content-muted",
    accent: "bg-accent-soft text-accent",
    urgent: "bg-urgent/10 text-urgent",
    warn: "bg-warn/10 text-warn",
    ok: "bg-ok/10 text-ok",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded px-1.5 py-0.5 text-2xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const urgencyTone: Record<Urgency, "urgent" | "warn" | "ok" | "neutral"> = {
  past: "neutral",
  urgent: "urgent",
  warn: "warn",
  ok: "ok",
};

/** Renders a relative countdown (e.g. "in 3 days") colored by urgency. */
export function CountdownBadge({ iso }: { iso: string | null | undefined }) {
  const c = countdown(iso);
  if (!c) return null;
  return <Badge tone={urgencyTone[c.urgency]}>{c.label}</Badge>;
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
      {icon && <div className="text-content-subtle">{icon}</div>}
      <p className="text-sm font-medium text-content-muted">{title}</p>
      {hint && <p className="max-w-xs text-xs text-content-subtle">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
