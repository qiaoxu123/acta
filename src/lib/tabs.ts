/**
 * Tab model for the Zotero-style workspace. A tab is a thin presentation layer
 * over the existing hash router: each tab maps to an href, and the single
 * source of truth for "what path is which tab" lives here so the TabBar, the
 * row-open helpers, and `useTabSync` all parse paths the same way.
 *
 * Two kinds:
 *  - "list"  — a section's master list (e.g. /reviews). Title comes from i18n
 *              (`titleKey`) so it follows the language switch.
 *  - "item"  — a single record opened for full management (e.g.
 *              /reviews/item/<id>). Title is the record's own name.
 *
 * Note: an in-list selection like /reviews/<id> still maps to the list tab —
 * only the explicit /item/<id> route is an item tab.
 */
import type { TFn } from "@/lib/i18n";

export type TabKind = "list" | "item";

export interface Tab {
  id: string;
  kind: TabKind;
  section: string;
  href: string;
  itemId?: string;
  title: string;
  titleKey?: string;
  closable: boolean;
}

interface SectionDef {
  key: string;
  base: string;
  titleKey: string;
  items: boolean;
}

/** Ordered most-specific-first; the "/" dashboard is matched only exactly. */
const SECTIONS: SectionDef[] = [
  { key: "projects/vertical", base: "/projects/vertical", titleKey: "nav.projects.vertical", items: true },
  { key: "projects/horizontal", base: "/projects/horizontal", titleKey: "nav.projects.horizontal", items: true },
  { key: "journals", base: "/journals", titleKey: "nav.journals", items: true },
  { key: "conferences", base: "/conferences", titleKey: "nav.conferences", items: true },
  { key: "papers", base: "/papers", titleKey: "nav.papers", items: true },
  { key: "patents", base: "/patents", titleKey: "nav.patents", items: true },
  { key: "reviews", base: "/reviews", titleKey: "nav.reviews", items: true },
  { key: "settings", base: "/settings", titleKey: "nav.settings", items: false },
  { key: "dashboard", base: "/", titleKey: "nav.dashboard", items: false },
];

function strip(pathname: string): string {
  const p = pathname.replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

function findSection(pathname: string): SectionDef | null {
  const p = strip(pathname);
  for (const s of SECTIONS) {
    if (s.base === "/") continue;
    if (p === s.base || p.startsWith(s.base + "/")) return s;
  }
  if (p === "/") return SECTIONS.find((s) => s.key === "dashboard") ?? null;
  return null;
}

function listTab(s: SectionDef): Tab {
  return {
    id: `list:${s.key}`,
    kind: "list",
    section: s.key,
    href: s.base,
    title: s.key,
    titleKey: s.titleKey,
    closable: s.key !== "dashboard",
  };
}

/** Map any pathname to the tab that should be active for it (or null). */
export function parsePath(pathname: string): Tab | null {
  const s = findSection(pathname);
  if (!s) return null;
  const p = strip(pathname);
  if (s.items) {
    const prefix = s.base + "/item/";
    if (p.startsWith(prefix)) {
      let itemId: string;
      try {
        itemId = decodeURIComponent(p.slice(prefix.length));
      } catch {
        return null; // malformed persisted href — drop just this one
      }
      if (itemId)
        return {
          id: itemTabId(s.key, itemId),
          kind: "item",
          section: s.key,
          href: p,
          itemId,
          title: "",
          closable: true,
        };
    }
  }
  return listTab(s);
}

export function itemTabId(section: string, id: string): string {
  return `${section}:${id}`;
}

export function itemHref(section: string, id: string): string {
  const s = SECTIONS.find((x) => x.key === section);
  if (!s) throw new Error(`unknown tab section: ${section}`);
  return `${s.base}/item/${encodeURIComponent(id)}`;
}

/** Build the descriptor for opening a record in a dedicated management tab. */
export function itemTab(section: string, id: string, title: string): Tab {
  return {
    id: itemTabId(section, id),
    kind: "item",
    section,
    href: itemHref(section, id),
    itemId: id,
    title,
    closable: true,
  };
}

/** Display label: list tabs translate their key, item tabs show the record name. */
export function tabLabel(tab: Tab, t: TFn): string {
  if (tab.titleKey) return t(tab.titleKey);
  return tab.title || "…";
}
