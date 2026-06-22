import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Building2,
  BookText,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FileText,
  Landmark,
  LayoutDashboard,
  Library,
  Lightbulb,
  ScrollText,
  Settings,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { tabLabel, type Tab } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";
import { confirmDialog } from "@/lib/confirm";
import { onTitlebarDoubleClick } from "@/lib/titlebar";
import { useI18n } from "@/lib/i18n";

const SECTION_ICON: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  journals: BookText,
  conferences: CalendarClock,
  papers: FileText,
  patents: ScrollText,
  reviews: Library,
  sparks: Sparkles,
  ideas: Lightbulb,
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

  const navBtn =
    "rounded p-1 text-content-subtle transition-colors hover:bg-surface hover:text-content";

  return (
    // Top padding (pt-8) sinks the bar below the overlaid traffic lights so the
    // tabs line up with the sidebar "Acta" header; tabs bottom-align to the
    // divider for the browser-tab look.
    <div
      data-tauri-drag-region
      onDoubleClick={onTitlebarDoubleClick}
      className="flex items-end border-b border-border bg-surface-sunken pt-8"
    >
      <div className="flex shrink-0 items-center gap-0.5 pb-1.5 pl-1.5 pr-1">
        <button onClick={() => navigate(-1)} title={t("nav.back")} className={navBtn}>
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => navigate(1)} title={t("nav.forward")} className={navBtn}>
          <ChevronRight size={15} />
        </button>
      </div>
      <div
        data-tauri-drag-region
        className="flex flex-1 items-end gap-0.5 overflow-x-auto pr-1.5"
      >
      {tabs.map((tab) => {
        const Icon = SECTION_ICON[tab.section];
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            data-tab
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
    </div>
  );
}
