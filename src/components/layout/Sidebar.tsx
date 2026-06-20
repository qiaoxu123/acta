import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  BookText,
  Building2,
  CalendarClock,
  FileText,
  Landmark,
  LayoutDashboard,
  Library,
  Languages,
  Moon,
  ScrollText,
  Settings,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";
import { useI18n } from "@/lib/i18n";

const TOP = { to: "/", key: "nav.dashboard", icon: LayoutDashboard, end: true };

const GROUPS = [
  {
    label: "side.results",
    items: [
      { to: "/journals", key: "nav.journals", icon: BookText },
      { to: "/conferences", key: "nav.conferences", icon: CalendarClock },
      { to: "/papers", key: "nav.papers", icon: FileText },
      { to: "/patents", key: "nav.patents", icon: ScrollText },
    ],
  },
  {
    label: "side.projects",
    items: [
      { to: "/projects/vertical", key: "nav.projects.vertical", icon: Landmark },
      { to: "/projects/horizontal", key: "nav.projects.horizontal", icon: Building2 },
    ],
  },
  {
    label: "side.other",
    items: [{ to: "/reviews", key: "nav.reviews", icon: Library }],
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

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  const btnClass =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-content-muted transition-colors hover:bg-surface-raised hover:text-content";

  return (
    <aside className="flex h-full w-full flex-col border-r border-border bg-surface-sunken">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <span className="grid h-6 w-6 place-items-center rounded bg-accent text-accent-fg text-sm font-bold">
          A
        </span>
        <span className="text-sm font-semibold tracking-tight">Acta</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <NavLink to={TOP.to} end={TOP.end} className={linkClass}>
          <TOP.icon size={16} />
          {t(TOP.key)}
        </NavLink>

        {GROUPS.map((g) => (
          <div key={g.label} className="mt-3">
            <p className="px-2.5 pb-1 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
              {t(g.label)}
            </p>
            <div className="space-y-0.5">
              {g.items.map(({ to, key, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkClass}>
                  <Icon size={16} />
                  {t(key)}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

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
      </div>
    </aside>
  );
}
