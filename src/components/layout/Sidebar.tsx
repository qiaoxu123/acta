import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  Banknote,
  BookText,
  Building2,
  CalendarClock,
  FileText,
  Landmark,
  LayoutDashboard,
  Library,
  Lightbulb,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Languages,
  Moon,
  LogOut,
  ScrollText,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { useState } from "react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";
import { useModules, type ModuleKey } from "@/store/modules";
import { useAuth } from "@/store/auth";
import { useSidebar } from "@/store/sidebar";

const TOP = { to: "/", key: "nav.dashboard", icon: LayoutDashboard, end: true };

const GROUPS: {
  label: string;
  items: { to: string; key: string; icon: typeof Sparkles; module?: ModuleKey }[];
}[] = [
  {
    label: "side.research",
    items: [
      { to: "/sparks", key: "nav.sparks", icon: Sparkles, module: "sparks" },
      { to: "/ideas", key: "nav.ideas", icon: Lightbulb, module: "ideas" },
      { to: "/notes", key: "nav.notes", icon: NotebookPen, module: "notes" },
    ],
  },
  {
    // Things to keep an eye on (deadlines, review obligations) — not own work.
    label: "side.tracking",
    items: [
      { to: "/journals", key: "nav.journals", icon: BookText, module: "venues" },
      { to: "/conferences", key: "nav.conferences", icon: CalendarClock, module: "venues" },
      { to: "/reviews", key: "nav.reviews", icon: Library, module: "reviews" },
      { to: "/students", key: "nav.students", icon: Users, module: "students" },
    ],
  },
  {
    // Own scholarly output.
    label: "side.results",
    items: [
      { to: "/papers", key: "nav.papers", icon: FileText, module: "papers" },
      { to: "/patents", key: "nav.patents", icon: ScrollText, module: "patents" },
    ],
  },
  {
    label: "side.projects",
    items: [
      { to: "/projects/vertical", key: "nav.projects.vertical", icon: Landmark, module: "projects" },
      { to: "/projects/horizontal", key: "nav.projects.horizontal", icon: Building2, module: "projects" },
      { to: "/funding", key: "nav.funding", icon: Banknote, module: "funding" },
    ],
  },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  clsx(
    "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
    isActive
      ? "bg-accent-soft text-accent"
      : "text-content-muted hover:bg-surface-raised hover:text-content",
  );

export function Sidebar() {
  const { t, locale, setLocale } = useI18n();
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const enabled = useModules((s) => s.enabled);
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const collapsed = useSidebar((s) => s.collapsed);
  const toggleCollapsed = useSidebar((s) => s.toggle);

  // Hide disabled modules; drop a group entirely once it has nothing to show.
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => !it.module || enabled[it.module]),
  })).filter((g) => g.items.length > 0);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const btnClass =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-content-muted transition-colors hover:bg-surface-raised hover:text-content";

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-surface-sunken">
      {/* Logo + collapse toggle */}
      <div className={clsx(
        "flex items-center border-b border-border",
        collapsed ? "justify-center px-1 py-3" : "justify-between px-4 py-3"
      )}>
        <div className={clsx("flex items-center gap-2", collapsed ? "justify-center" : "")}>
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-accent text-sm font-bold text-accent-fg">A</span>
          {!collapsed && <span className="text-sm font-semibold tracking-tight text-content">Acta</span>}
        </div>
        {!collapsed && (
          <button onClick={toggleCollapsed} title={t("nav.back")} className="rounded p-1 text-content-subtle hover:text-content">
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-1 pt-2">
        {/* Dashboard always visible */}
        <NavLink to={TOP.to} end={TOP.end} title={t(TOP.key)}
          className={(s) => clsx(linkClass(s), collapsed && "justify-center")}>
          <TOP.icon size={16} />
          {!collapsed && t(TOP.key)}
        </NavLink>

        {groups.map((g) => (
          <div key={g.label} className={collapsed ? "mt-2" : "mt-3"}>
            {!collapsed && (
              <p className="px-2.5 pb-1 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
                {t(g.label)}
              </p>
            )}
            <div className="space-y-0.5">
              {g.items.map(({ to, key, icon: Icon }) => (
                <NavLink key={to} to={to} title={t(key)}
                  className={(s) => clsx(linkClass(s), collapsed && "justify-center")}>
                  <Icon size={16} />
                  {!collapsed && t(key)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        {/* Collapse-toggle in collapsed mode: expand button at the bottom */}
        {collapsed && (
          <div className="mt-3 border-t border-border pt-3">
            <button onClick={toggleCollapsed} className={clsx(btnClass, "justify-center")} title={t("nav.back")}>
              <PanelLeftOpen size={16} />
            </button>
          </div>
        )}
      </nav>

      {!collapsed && (
        <div className="space-y-0.5 border-t border-border px-2 py-2">
          <NavLink to="/settings" className={linkClass}>
            <Settings size={16} />
            {t("nav.settings")}
          </NavLink>
          <button onClick={toggleTheme} className={btnClass}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? t("theme.light") : t("theme.dark")}
          </button>
          <button onClick={() => setLocale(locale === "zh" ? "en" : "zh")} className={btnClass}>
            <Languages size={16} />
            {t("lang.label")}
          </button>
          {session && typeof session === 'object' && (
            <>
              <div className="mt-1.5 border-t border-border pt-1.5">
                <p className="truncate px-2.5 py-0.5 text-2xs text-content-subtle">
                  {t("auth.loggedInAs", { name: session.username })}
                </p>
              </div>
              <button onClick={logout} className={btnClass}>
                <LogOut size={16} />
                {t("auth.logout")}
              </button>
            </>
          )}
        </div>
      )}
      {collapsed && session && typeof session === 'object' && (
        <div className="border-t border-border px-2 py-1.5">
          <button onClick={logout} title={t("auth.logout")} className="flex w-full justify-center rounded p-1.5 text-content-subtle hover:text-content">
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
