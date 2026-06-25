import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

export interface PickOption {
  value: string;
  label: string;
  /** Optional swatch/badge node shown left of the label. */
  node?: ReactNode;
}

/**
 * A click-to-pick inline editor. The trigger renders `children` (e.g. a Badge);
 * clicking opens a small portal-rendered menu so it is never clipped by a
 * table cell's `overflow:hidden`. Stops propagation so the row's own click
 * (select / navigate) does not fire.
 */
export function InlinePicker({
  value,
  options,
  onChange,
  children,
  title,
}: {
  value: string;
  options: PickOption[];
  onChange: (value: string) => void;
  children: ReactNode;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 4 });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        title={title}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex max-w-full items-center rounded outline-none ring-accent/40 hover:ring-2"
      >
        {children}
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          style={{ left: pos.left, top: pos.top }}
          className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-panel py-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {options.map((o) => (
            <button
              key={o.value}
              onClick={(e) => { e.stopPropagation(); onChange(o.value); setOpen(false); }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs text-content hover:bg-surface-sunken"
            >
              {o.node}
              <span className="flex-1 truncate">{o.label}</span>
              {o.value === value && <Check size={13} className="shrink-0 text-accent" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * Click-to-edit text field. Shows `value` (or a muted placeholder); clicking
 * turns it into an input that commits on Enter/blur and cancels on Escape.
 */
export function InlineText({
  value,
  onChange,
  placeholder = "—",
  type = "text",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onChange(draft.trim());
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(value); setEditing(false); }
        }}
        className={`w-full rounded border border-accent/50 bg-surface px-1.5 py-0.5 text-xs text-content outline-none ${className}`}
      />
    );
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={`max-w-full truncate rounded px-1.5 py-0.5 text-left text-xs hover:bg-surface-sunken ${value ? "text-content" : "text-content-subtle"} ${className}`}
    >
      {value || placeholder}
    </button>
  );
}
