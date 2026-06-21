import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge, CountdownBadge } from "@/components/ui/misc";
import { ListControls, type Option } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  deleteManuscript,
  listManuscripts,
  reviewDueMap,
} from "@/db/repositories/reviews";
import type { ManuscriptStatus, ReviewedManuscript } from "@/db/types";
import { formatDate } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { arrange, cmpDesc, cmpDueSoon, cmpStr, useListView } from "@/lib/listview";
import { itemTab, itemTabId } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";
import { useRefresh } from "@/store/refresh";
import { ManuscriptForm } from "./ManuscriptForm";
import { ManuscriptDetail } from "./ManuscriptDetail";

type Row = ReviewedManuscript & { _due: string | null };

// Accepted (active commitments) sort ahead of merely-invited.
const STATUS_ORDER: ManuscriptStatus[] = [
  "accepted",
  "in_progress",
  "invited",
  "submitted",
  "done",
  "declined",
];
const ACTIVE_STATUSES = ["invited", "accepted", "in_progress"];
const ROLE_ORDER = ["reviewer", "meta", "pc"];

const GROUP_OPTIONS: Option[] = [
  { value: "status", labelKey: "lv.group.status" },
  { value: "venue", labelKey: "lv.group.venue" },
  { value: "role", labelKey: "lv.group.role" },
];

const compare = (key: string, a: Row, b: Row) => {
  switch (key) {
    case "title":
      return cmpStr(a.title, b.title);
    case "venue":
      return cmpStr(a.venue_name, b.venue_name) || cmpStr(a.title, b.title);
    case "role":
      return ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || cmpStr(a.title, b.title);
    case "due":
      return cmpDueSoon(a._due, b._due);
    case "status":
      return (
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        cmpDueSoon(a._due, b._due)
      );
    default:
      return cmpDesc(a.updated_at, b.updated_at);
  }
};

export function ReviewsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [view, setView] = useListView("acta.lv.reviews", {
    sort: "due",
    group: "status",
    scope: "active",
  });
  const [items, setItems] = useState<ReviewedManuscript[]>([]);
  const [dueMap, setDueMap] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; edit?: ReviewedManuscript | null }>(
    { open: false },
  );

  useEffect(() => {
    listManuscripts(view.scope).then(setItems);
    reviewDueMap().then(setDueMap);
  }, [tick, view.scope]);

  // Keep the list tidy: when grouped by status, collapse everything except the
  // reviews actually in progress (accepted / in_progress), so the large pile of
  // unanswered invitations stays tucked away (one click to expand).
  useEffect(() => {
    setCollapsed(
      view.group === "status"
        ? new Set(["invited", "submitted", "done", "declined"])
        : new Set(),
    );
  }, [view.group]);

  const groupOf = (key: string, m: Row) => {
    if (key === "venue") return { key: m.venue_name || "—", label: m.venue_name || "—" };
    if (key === "role")
      return { key: m.role, label: t(`role.${m.role}`), order: ROLE_ORDER.indexOf(m.role) };
    return { key: m.status, label: t(`mstatus.${m.status}`), order: STATUS_ORDER.indexOf(m.status) };
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: Row[] = items
      .map((m) => ({ ...m, _due: dueMap[m.id] ?? null }))
      .filter((m) =>
        !q
          ? true
          : [m.title, m.venue_name, m.manuscript_id]
              .filter(Boolean)
              .some((s) => s!.toLowerCase().includes(q)),
      );
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [items, dueMap, query, view.sort, view.group, t]);

  const now = new Date().toISOString();
  const isOverdue = (m: Row) =>
    !!m._due && m._due < now && ACTIVE_STATUSES.includes(m.status);

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: t("col.title"),
      width: "minmax(0,1fr)",
      sortable: true,
      render: (m) => <span className="truncate font-medium text-content">{m.title}</span>,
    },
    {
      key: "venue",
      label: t("col.venue"),
      width: "120px",
      sortable: true,
      render: (m) => <span className="truncate text-content-muted">{m.venue_name || "—"}</span>,
    },
    {
      key: "status",
      label: t("col.status"),
      width: "124px",
      sortable: true,
      render: (m) => (
        <>
          <Badge>{t(`mstatus.${m.status}`)}</Badge>
          {isOverdue(m) && <Badge tone="urgent">{t("rev.overdue")}</Badge>}
        </>
      ),
    },
    {
      key: "role",
      label: t("col.role"),
      width: "76px",
      sortable: true,
      render: (m) => <Badge tone="accent">{t(`role.${m.role}`)}</Badge>,
    },
    {
      key: "due",
      label: t("col.due"),
      width: "168px",
      sortable: true,
      align: "right",
      render: (m) =>
        m._due ? (
          <>
            <span className="text-2xs text-content-subtle">{formatDate(m._due)}</span>
            <CountdownBadge iso={m._due} />
          </>
        ) : (
          <span className="text-content-subtle">—</span>
        ),
    },
  ];

  const selected = items.find((m) => m.id === id) ?? null;
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  // A click opens (or focuses) the manuscript in its own management tab.
  const openItem = (rid: string) => {
    const m = items.find((x) => x.id === rid);
    const tab = itemTab("reviews", rid, m?.title ?? "");
    useTabs.getState().openTab(tab);
    navigate(tab.href);
  };

  const remove = async (m: ReviewedManuscript) => {
    if (await confirmDialog(t("rev.confirmDelete", { title: m.title }))) {
      await deleteManuscript(m.id);
      useTabs.getState().closeTab(itemTabId("reviews", m.id));
      useRefresh.getState().bump();
      if (id === m.id) navigate("/reviews");
    }
  };

  return (
    <>
      <Toolbar
        title={t("rev.title")}
        subtitle={t("rev.count", { n: items.length })}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> {t("rev.new")}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-panel px-2 py-1.5">
          <div className="relative w-56">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
            <TextInput
              className="pl-7"
              placeholder={t("rev.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ml-auto w-72">
            <ListControls hideSort groupOptions={GROUP_OPTIONS} view={view} onChange={setView} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto">
            <DataTable
              columns={columns}
              sections={sections}
              sortKey={view.sort}
              onSort={(k) => setView({ sort: k })}
              getId={(m) => m.id}
              selectedId={id}
              onSelect={openItem}
              collapsed={collapsed}
              onToggle={toggle}
              empty={
                <p className="px-3 py-8 text-center text-2xs text-content-subtle">
                  {view.scope === "archived" ? t("lv.empty.archived") : t("rev.nomatch")}
                </p>
              }
            />
          </div>

          <DockPanel
            selected={!!selected}
            onOpenInTab={selected ? () => openItem(selected.id) : undefined}
          >
            {selected && (
              <ManuscriptDetail
                manuscript={selected}
                t={t}
                onEdit={() => setForm({ open: true, edit: selected })}
                onDelete={() => remove(selected)}
              />
            )}
          </DockPanel>
        </div>
      </div>

      <ManuscriptForm
        open={form.open}
        existing={form.edit}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`/reviews/${savedId}`)}
      />
    </>
  );
}
