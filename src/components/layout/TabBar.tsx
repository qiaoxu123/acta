import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Building2,
  BookText,
  CalendarClock,
  FileText,
  Landmark,
  LayoutDashboard,
  Library,
  ScrollText,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { tabLabel, type Tab } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";

const SECTION_ICON: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  journals: BookText,
  conferences: CalendarClock,
  papers: FileText,
  patents: ScrollText,
  reviews: Library,
  "projects/vertical": Landmark,
  "projects/horizontal": Building2,
  settings: Settings,
};

/** The browser-like workspace tab strip above the routed content. */
export function TabBar() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tabs = useTabs((s) => s.tabs);
  const activeId = useTabs((s) => s.activeId);
  const activate = useTabs((s) => s.activate);
  const closeTab = useTabs((s) => s.closeTab);
  const closeOthers = useTabs((s) => s.closeOthers);

  const open = (tab: Tab) => {
    activate(tab.id);
    navigate(tab.href);
  };
  const close = (e: React.MouseEvent, tab: Tab) => {
    e.stopPropagation();
    const next = closeTab(tab.id);
    if (next) navigate(next);
  };

  return (
    <div
      data-tauri-drag-region
      className="flex items-stretch gap-0.5 overflow-x-auto border-b border-border bg-surface-sunken px-1.5 pt-2.5"
    >
      {tabs.map((tab) => {
        const Icon = SECTION_ICON[tab.section];
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            onClick={() => open(tab)}
            onAuxClick={(e) => e.button === 1 && tab.closable && close(e, tab)}
            onContextMenu={async (e) => {
              e.preventDefault();
              const others = useTabs
                .getState()
                .tabs.filter((x) => x.id !== tab.id && x.closable);
              if (others.length === 0) return;
              if (await confirmDialog(t("tab.closeOthersConfirm", { n: others.length })))
                navigate(closeOthers(tab.id));
            }}
            title={tabLabel(tab, t)}
            className={clsx(
              "group flex max-w-[200px] cursor-pointer select-none items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 py-1.5 text-xs",
              active
                ? "border-border bg-surface font-medium text-content"
                : "border-transparent text-content-muted hover:bg-surface/60 hover:text-content",
            )}
          >
            {Icon && <Icon size={13} className="shrink-0" />}
            <span className="truncate">{tabLabel(tab, t)}</span>
            {tab.closable && (
              <button
                onClick={(e) => close(e, tab)}
                className="-mr-1 ml-0.5 shrink-0 rounded p-0.5 text-content-subtle opacity-0 transition hover:bg-surface-sunken hover:text-content group-hover:opacity-100"
                title={t("tab.close")}
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
