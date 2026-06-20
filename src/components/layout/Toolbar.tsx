import type { ReactNode } from "react";

/** The header bar at the top of every page: title, optional subtitle, actions. */
export function Toolbar({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
      <div className="min-w-0">
        <h1 className="truncate text-sm font-semibold text-content">{title}</h1>
        {subtitle && (
          <p className="truncate text-2xs text-content-subtle">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
