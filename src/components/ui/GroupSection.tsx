import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** A collapsible section header for grouped lists. When `label` is empty the
 *  header is hidden (the "no grouping" case). */
export function GroupSection({
  label,
  count,
  collapsed,
  onToggle,
  children,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  if (!label) return <>{children}</>;
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="sticky top-0 z-10 flex w-full items-center gap-1 bg-panel px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-content-subtle"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        <span className="truncate">{label}</span>
        <span className="ml-auto rounded bg-surface px-1.5 text-content-subtle">
          {count}
        </span>
      </button>
      {!collapsed && children}
    </div>
  );
}
