import clsx from "clsx";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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

const MIN_COL = 48;

function loadWidths(storageKey?: string): Record<string, number> {
  if (!storageKey) return {};
  try {
    const raw = localStorage.getItem(`acta.cols.${storageKey}`);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
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
  storageKey,
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
  /** Persist drag-resized column widths under acta.cols.<storageKey>. */
  storageKey?: string;
}) {
  const [widths, setWidths] = useState<Record<string, number>>(() => loadWidths(storageKey));
  // Mirror of `widths` so the drag's mouseup handler can persist the final value
  // without writing to localStorage on every mousemove frame.
  const widthsRef = useRef(widths);
  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  const save = (w: Record<string, number>) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(`acta.cols.${storageKey}`, JSON.stringify(w));
    } catch {
      /* ignore quota / serialization errors */
    }
  };

  // Drag a column's right border to set an explicit px width. The starting
  // width is read from the live header cell so even flexible (1fr) columns get
  // a concrete handle. Persisted once on mouseup. Double-click clears the override.
  const startResize = (e: React.MouseEvent, key: string) => {
    e.preventDefault();
    e.stopPropagation();
    const cell = (e.currentTarget as HTMLElement).closest("[data-col]") as HTMLElement | null;
    const startX = e.clientX;
    const startW = cell?.getBoundingClientRect().width ?? MIN_COL;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(MIN_COL, Math.round(startW + ev.clientX - startX));
      setWidths((prev) => ({ ...prev, [key]: w }));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      save(widthsRef.current);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const resetCol = (key: string) =>
    setWidths((prev) => {
      const next = { ...prev };
      delete next[key];
      save(next);
      return next;
    });

  const grid = {
    gridTemplateColumns: columns
      .map((c) => (widths[c.key] != null ? `${widths[c.key]}px` : c.width))
      .join(" "),
  };
  const total = sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <div className="min-w-0 text-xs">
      {/* Header */}
      <div
        style={grid}
        className="sticky top-0 z-10 grid items-center gap-x-3 border-b border-border bg-panel px-3 py-1.5"
      >
        {columns.map((c, i) => (
          <div key={c.key} data-col className="relative flex min-w-0 items-center">
            <button
              disabled={!c.sortable}
              onClick={() => c.sortable && onSort(c.key)}
              className={clsx(
                "flex min-w-0 flex-1 items-center gap-0.5 truncate text-2xs font-semibold uppercase tracking-wide",
                c.align === "right" && "justify-end",
                c.sortable ? "hover:text-content" : "cursor-default",
                sortKey === c.key ? "text-accent" : "text-content-subtle",
              )}
            >
              <span className="truncate">{c.label}</span>
              {sortKey === c.key && <ChevronDown size={11} className="shrink-0" />}
            </button>
            {i < columns.length - 1 && (
              <div
                onMouseDown={(e) => startResize(e, c.key)}
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={() => resetCol(c.key)}
                title="拖动调整列宽 · 双击重置"
                className="group absolute right-0 top-1/2 z-20 flex h-5 w-2.5 -translate-y-1/2 cursor-col-resize items-center justify-end"
              >
                <div className="h-3.5 w-px bg-border transition-colors group-hover:bg-accent" />
              </div>
            )}
          </div>
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
