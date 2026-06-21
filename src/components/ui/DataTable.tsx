import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Section } from "@/lib/listview";

export interface Column<T> {
  key: string;
  label: string;
  /** CSS grid track, e.g. "minmax(0,1fr)" or "120px". */
  width: string;
  sortable?: boolean;
  align?: "right";
  render: (item: T) => ReactNode;
}

/**
 * A dense, grid-based data table with sortable headers, collapsible group
 * sections, and single-row selection. Not a real <table> so group headers and
 * sticky headers compose cleanly.
 */
export function DataTable<T>({
  columns,
  sections,
  sortKey,
  onSort,
  getId,
  selectedId,
  onSelect,
  collapsed,
  onToggle,
  empty,
}: {
  columns: Column<T>[];
  sections: Section<T>[];
  sortKey: string;
  onSort: (key: string) => void;
  getId: (item: T) => string;
  selectedId?: string;
  /** Row click handler — opens the row (in a tab). */
  onSelect: (id: string) => void;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
  empty?: ReactNode;
}) {
  const grid = { gridTemplateColumns: columns.map((c) => c.width).join(" ") };
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="min-w-0 text-xs">
      {/* Header */}
      <div
        style={grid}
        className="sticky top-0 z-10 grid items-center gap-x-3 border-b border-border bg-panel px-3 py-1.5"
      >
        {columns.map((c) => (
          <button
            key={c.key}
            disabled={!c.sortable}
            onClick={() => c.sortable && onSort(c.key)}
            className={clsx(
              "flex items-center gap-0.5 truncate text-2xs font-semibold uppercase tracking-wide",
              c.align === "right" && "justify-end",
              c.sortable ? "hover:text-content" : "cursor-default",
              sortKey === c.key ? "text-accent" : "text-content-subtle",
            )}
          >
            <span className="truncate">{c.label}</span>
            {sortKey === c.key && <ChevronDown size={11} className="shrink-0" />}
          </button>
        ))}
      </div>

      {total === 0 && empty ? (
        empty
      ) : (
        sections.map((sec) => (
          <div key={sec.key}>
            {sec.label && (
              <button
                onClick={() => onToggle(sec.key)}
                className="flex w-full items-center gap-1 border-b border-border bg-surface-sunken px-3 py-1 text-2xs font-semibold uppercase tracking-wide text-content-subtle"
              >
                {collapsed.has(sec.key) ? (
                  <ChevronRight size={11} />
                ) : (
                  <ChevronDown size={11} />
                )}
                <span className="truncate">{sec.label}</span>
                <span className="ml-auto rounded bg-surface px-1.5">
                  {sec.items.length}
                </span>
              </button>
            )}
            {!collapsed.has(sec.key) &&
              sec.items.map((it) => {
                const id = getId(it);
                return (
                  <div
                    key={id}
                    onClick={() => onSelect(id)}
                    style={grid}
                    className={clsx(
                      "grid cursor-pointer items-center gap-x-3 border-b border-border/50 px-3 py-2 transition-colors",
                      selectedId === id
                        ? "bg-accent-soft"
                        : "hover:bg-surface-sunken",
                    )}
                  >
                    {columns.map((c) => (
                      <div
                        key={c.key}
                        className={clsx(
                          "flex min-w-0 items-center gap-1.5 truncate",
                          c.align === "right" && "justify-end",
                        )}
                      >
                        {c.render(it)}
                      </div>
                    ))}
                  </div>
                );
              })}
          </div>
        ))
      )}
    </div>
  );
}
