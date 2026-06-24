/**
 * Section routing helpers. A "section" is a top-level area of the app (reviews,
 * papers, ideas, a project category…). This module is the single source of truth
 * mapping pathnames ↔ sections so the top-bar breadcrumb and the row-open helpers
 * agree on what path belongs to which section.
 *
 * Records open at `/<base>/item/<id>` (full-width management view); the in-list
 * selection `/<base>/<id>` still belongs to the same section.
 */
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
  { key: "sparks", base: "/sparks", titleKey: "nav.sparks", items: false },
  { key: "notes", base: "/notes", titleKey: "nav.notes", items: false },
  { key: "reports", base: "/reports", titleKey: "nav.reports", items: true },
  { key: "ideas", base: "/ideas", titleKey: "nav.ideas", items: true },
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

export interface SectionInfo {
  key: string;
  titleKey: string;
  base: string;
}

/** The section a pathname lives in (for the top-bar breadcrumb), or null. */
export function sectionInfo(pathname: string): SectionInfo | null {
  const s = findSection(pathname);
  return s ? { key: s.key, titleKey: s.titleKey, base: s.base } : null;
}

/** The route that opens a record's full-width management view. */
export function itemHref(section: string, id: string): string {
  const s = SECTIONS.find((x) => x.key === section);
  if (!s) throw new Error(`unknown section: ${section}`);
  return `${s.base}/item/${encodeURIComponent(id)}`;
}
