import type { ReactNode } from "react";
import clsx from "clsx";
import { Maximize2, Pin, PanelRightClose, PanelRightOpen } from "lucide-react";
import { ResizableRight } from "./ResizableRight";
import { useDock } from "@/store/dockPanel";
import { useI18n } from "@/lib/i18n";

/**
 * The dockable right preview panel. Wraps ResizableRight and adds pin / collapse
 * controls so the panel can stay open across selections (pinned) or be hidden
 * to a thin reopen strip (collapsed). Drop-in replacement for the old inline
 * `selected && <ResizableRight>…</ResizableRight>` block on each list page.
 */
export function DockPanel({
  selected,
  onOpenInTab,
  children,
}: {
  selected: boolean;
  /** Opens the previewed record in a dedicated tab (the discoverable path to
   *  the double-click action). Shown as a button in the panel header. */
  onOpenInTab?: () => void;
  children: ReactNode;
}) {
  const { pinned, collapsed, togglePin, toggleCollapsed } = useDock();
  const { t } = useI18n();

  // Records open in tabs (single-click), so the side panel only appears for an
  // explicit in-list selection. Nothing selected → no panel (and no stale
  // pinned-empty strip).
  if (!selected) return null;

  if (collapsed) {
    return (
      <button
        onClick={toggleCollapsed}
        title={t("dock.expand")}
        className="flex w-8 shrink-0 items-center justify-center border-l border-border bg-surface text-content-subtle transition-colors hover:bg-surface-sunken hover:text-content"
      >
        <PanelRightOpen size={15} />
      </button>
    );
  }

  return (
    <ResizableRight storageKey="acta.w.detail" defaultWidth={440}>
      <div className="sticky top-0 z-10 flex items-center justify-end gap-0.5 border-b border-border bg-panel px-2 py-1">
        {onOpenInTab && (
          <button
            onClick={onOpenInTab}
            title={t("item.openInTab")}
            className="mr-auto inline-flex items-center gap-1 rounded px-1.5 py-1 text-2xs text-content-subtle transition-colors hover:bg-surface-sunken hover:text-content"
          >
            <Maximize2 size={12} /> {t("item.openInTab")}
          </button>
        )}
        <button
          onClick={togglePin}
          title={pinned ? t("dock.unpin") : t("dock.pin")}
          className={clsx(
            "rounded p-1 transition-colors hover:bg-surface-sunken",
            pinned ? "text-accent" : "text-content-subtle hover:text-content",
          )}
        >
          <Pin size={14} className={pinned ? "fill-current" : ""} />
        </button>
        <button
          onClick={toggleCollapsed}
          title={t("dock.collapse")}
          className="rounded p-1 text-content-subtle transition-colors hover:bg-surface-sunken hover:text-content"
        >
          <PanelRightClose size={14} />
        </button>
      </div>
      {children}
    </ResizableRight>
  );
}
