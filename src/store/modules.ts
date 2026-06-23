import { create } from "zustand";

/**
 * Which feature modules are enabled, chosen at first run by picking an identity
 * (student / researcher / faculty / custom) and adjustable later in Settings.
 * Disabled modules drop out of the sidebar and the dashboard. Persisted; the
 * `onboarded` flag drives the first-run picker.
 */
export type ModuleKey =
  | "venues"
  | "reviews"
  | "papers"
  | "patents"
  | "projects"
  | "ideas"
  | "sparks"
  | "notes"
  | "reports";

export const MODULES: { key: ModuleKey; labelKey: string }[] = [
  { key: "venues", labelKey: "mod.venues" },
  { key: "reviews", labelKey: "nav.reviews" },
  { key: "papers", labelKey: "nav.papers" },
  { key: "patents", labelKey: "nav.patents" },
  { key: "projects", labelKey: "side.projects" },
  { key: "ideas", labelKey: "nav.ideas" },
  { key: "sparks", labelKey: "nav.sparks" },
  { key: "notes", labelKey: "nav.notes" },
  { key: "reports", labelKey: "nav.reports" },
];
const KEYS = MODULES.map((m) => m.key);

export type RoleKey = "student" | "researcher" | "faculty" | "custom";

export const ROLE_MODULES: Record<RoleKey, ModuleKey[]> = {
  student: ["ideas", "sparks", "notes", "reports", "papers", "venues"],
  researcher: ["ideas", "sparks", "notes", "reports", "papers", "venues", "patents", "reviews"],
  faculty: [...KEYS],
  custom: [...KEYS],
};

export type Enabled = Record<ModuleKey, boolean>;

const allOn = (): Enabled => Object.fromEntries(KEYS.map((k) => [k, true])) as Enabled;

export function enabledFromRole(role: RoleKey): Enabled {
  const set = new Set(ROLE_MODULES[role]);
  return Object.fromEntries(KEYS.map((k) => [k, set.has(k)])) as Enabled;
}

const KEY = "acta.modules";

interface ModulesState {
  onboarded: boolean;
  enabled: Enabled;
  setEnabled: (k: ModuleKey, v: boolean) => void;
  complete: (enabled: Enabled) => void;
  reset: () => void;
}

function load(): { onboarded: boolean; enabled: Enabled } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { onboarded: !!d.onboarded, enabled: { ...allOn(), ...(d.enabled ?? {}) } };
    }
  } catch {
    /* ignore */
  }
  return { onboarded: false, enabled: allOn() };
}

export const useModules = create<ModulesState>((set, get) => {
  const persist = () => {
    const { onboarded, enabled } = get();
    localStorage.setItem(KEY, JSON.stringify({ onboarded, enabled }));
  };
  return {
    ...load(),
    setEnabled: (k, v) => {
      set((s) => ({ enabled: { ...s.enabled, [k]: v } }));
      persist();
    },
    complete: (enabled) => {
      set({ enabled, onboarded: true });
      persist();
    },
    reset: () => {
      set({ onboarded: false, enabled: allOn() });
      persist();
    },
  };
});
