import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  CalendarClock,
  LayoutDashboard,
  Library,
  Moon,
  Settings,
  Sun,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { applyTheme, getStoredTheme, type Theme } from "@/lib/theme";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/venues", label: "Venues & Deadlines", icon: CalendarClock },
  { to: "/reviews", label: "Reviews", icon: Library },
  { to: "/papers", label: "My Papers", icon: FileText },
];

export function Sidebar() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme());

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  };

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border bg-surface-sunken">
      <div className="flex items-center gap-2 px-4 py-3.5">
        <span className="grid h-6 w-6 place-items-center rounded bg-accent text-accent-fg text-sm font-bold">
          A
        </span>
        <span className="text-sm font-semibold tracking-tight">Acta</span>
      </div>

      <nav className="flex-1 space-y-0.5 px-2 py-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-content-muted hover:bg-surface-raised hover:text-content",
              )
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-0.5 border-t border-border px-2 py-2">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-accent-soft text-accent"
                : "text-content-muted hover:bg-surface-raised hover:text-content",
            )
          }
        >
          <Settings size={15} />
          Settings
        </NavLink>
        <button
          onClick={toggleTheme}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-content-muted transition-colors hover:bg-surface-raised hover:text-content"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
