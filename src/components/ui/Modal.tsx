import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./controls";

/** A lightweight centered modal. Closes on Escape and backdrop click. */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6 pt-[8vh]"
      onMouseDown={onClose}
    >
      <div
        className={
          "flex max-h-[84vh] w-full flex-col overflow-hidden rounded-lg border border-border bg-surface-raised shadow-2xl " +
          (wide ? "max-w-2xl" : "max-w-md")
        }
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-content">{title}</h2>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            <X size={15} />
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <footer className="flex justify-end gap-2 border-t border-border px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
