import { Fragment } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  type LucideIcon,
} from "lucide-react";
import { sectionInfo } from "@/lib/tabs";
import { useBreadcrumb, type Crumb } from "@/store/breadcrumb";
import { usePageHeader } from "@/store/pageHeader";
import { useI18n } from "@/lib/i18n";
import { isWindows } from "@/lib/platform";
import { WindowControls } from "./WindowControls";

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

/**
 * wolai-style location bar: back/forward + a breadcrumb path of the current
 * place (section › record). Item pages publish the record crumb to the
 * breadcrumb store; everywhere else we derive a section-only crumb from the
 * route. Doubles as the draggable macOS title bar region.
 */
export function TopBar() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { pathname } = useLocation();
  const bcPath = useBreadcrumb((s) => s.path);
  const bcTrail = useBreadcrumb((s) => s.trail);
  const setSlot = usePageHeader((s) => s.setEl);

  const info = sectionInfo(pathname);
  const section = info?.key ?? "dashboard";
  const Icon = SECTION_ICON[section] ?? LayoutDashboard;

  // Prefer the item page's published trail (carries the record title), but only
  // when it's for this exact path — otherwise show just the section.
  const trail: Crumb[] =
    bcPath === pathname && bcTrail.length
      ? bcTrail
      : info
        ? [{ label: t(info.titleKey), href: info.base }]
        : [];

  const navBtn =
    "rounded p-1 text-content-subtle transition-colors hover:bg-surface hover:text-content";

  return (
    // One full-width title bar across the very top (the macOS traffic-light
    // row), ToDesk-style: logo + nav + page actions all share this row, so the
    // strip beside the window controls isn't wasted. `pl` clears the lights.
    // `deep` makes the whole bar a drag region (native double-click-to-zoom);
    // interactive children (<button>s, crumbs with role="link") are excluded.
    <div
      data-tauri-drag-region="deep"
      className={clsx(
        "flex h-11 shrink-0 items-center gap-1 border-b border-border bg-surface-sunken",
        // macOS: clear the traffic lights on the left. Windows: frameless, so
        // no left inset; our own controls sit on the right (no right padding).
        isWindows ? "pl-2 pr-0" : "pl-[80px] pr-2",
      )}
    >
      <div className="flex shrink-0 items-center gap-0.5">
        <button onClick={() => navigate(-1)} title={t("nav.back")} className={navBtn}>
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => navigate(1)} title={t("nav.forward")} className={navBtn}>
          <ChevronRight size={15} />
        </button>
      </div>

      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto px-1 text-xs">
        {trail.map((c, i) => {
          const isLast = i === trail.length - 1;
          const clickable = !!c.href && !isLast;
          return (
            <Fragment key={i}>
              {i > 0 && (
                <ChevronRight size={12} className="shrink-0 text-content-subtle" />
              )}
              <span
                role={clickable ? "link" : undefined}
                onClick={clickable ? () => navigate(c.href!) : undefined}
                className={clsx(
                  "flex min-w-0 shrink-0 items-center gap-1.5",
                  clickable
                    ? "cursor-pointer text-content-muted transition-colors hover:text-content"
                    : isLast
                      ? "text-content"
                      : "text-content-muted",
                  isLast && "min-w-0 shrink",
                )}
              >
                {i === 0 && <Icon size={14} className="shrink-0 text-content-subtle" />}
                <span className={clsx(isLast && "truncate")}>{c.label}</span>
              </span>
            </Fragment>
          );
        })}
      </nav>

      {/* Page <Toolbar> portals its subtitle/actions here, filling the strip. */}
      <div
        ref={(el) => setSlot(el)}
        className="flex shrink-0 items-center gap-2 pr-1"
      />

      {/* Windows: app-drawn min/max/close (frameless window). */}
      {isWindows && <WindowControls />}
    </div>
  );
}
