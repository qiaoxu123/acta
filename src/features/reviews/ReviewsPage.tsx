import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { ResizableRight } from "@/components/layout/ResizableRight";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge, CountdownBadge } from "@/components/ui/misc";
import { ListControls, type Option } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  archiveManuscript,
  deleteManuscript,
  deleteRound,
  listManuscripts,
  listRounds,
  reviewDueMap,
} from "@/db/repositories/reviews";
import type { ManuscriptStatus, ReviewRound, ReviewedManuscript } from "@/db/types";
import { formatDate, formatDeadline } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc, cmpDue, cmpStr, useListView } from "@/lib/listview";
import { useRefresh } from "@/store/refresh";
import { ManuscriptForm } from "./ManuscriptForm";
import { RoundForm } from "./RoundForm";

type Row = ReviewedManuscript & { _due: string | null };

const RECT_TONE: Record<string, "ok" | "warn" | "urgent" | "neutral"> = {
  accept: "ok",
  minor: "ok",
  major: "warn",
  reject: "urgent",
};
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
      return cmpDue(a._due, b._due);
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || cmpDue(a._due, b._due);
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

  const remove = async (m: ReviewedManuscript) => {
    if (await confirmDialog(t("rev.confirmDelete", { title: m.title }))) {
      await deleteManuscript(m.id);
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
            onSelect={(rid) => navigate(`/reviews/${rid}`)}
            collapsed={collapsed}
            onToggle={toggle}
            empty={
              <p className="px-3 py-8 text-center text-2xs text-content-subtle">
                {view.scope === "archived" ? t("lv.empty.archived") : t("rev.nomatch")}
              </p>
            }
          />
        </div>

        {selected && (
          <ResizableRight storageKey="acta.w.detail" defaultWidth={440}>
            <ManuscriptDetail
              manuscript={selected}
              t={t}
              onEdit={() => setForm({ open: true, edit: selected })}
              onDelete={() => remove(selected)}
            />
          </ResizableRight>
        )}
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

function ManuscriptDetail({
  manuscript,
  t,
  onEdit,
  onDelete,
}: {
  manuscript: ReviewedManuscript;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tick = useRefresh((s) => s.tick);
  const [rounds, setRounds] = useState<ReviewRound[]>([]);
  const [roundForm, setRoundForm] = useState<{ open: boolean; edit?: ReviewRound | null }>(
    { open: false },
  );

  useEffect(() => {
    listRounds(manuscript.id).then(setRounds);
  }, [manuscript.id, tick]);

  const nextRound = rounds.length ? Math.max(...rounds.map((r) => r.round)) + 1 : 1;
  const archived = !!manuscript.archived_at;

  const removeRound = async (r: ReviewRound) => {
    if (await confirmDialog(t("rev.confirmDeleteRound", { n: r.round }))) {
      await deleteRound(r.id);
      useRefresh.getState().bump();
    }
  };
  const toggleArchive = async () => {
    await archiveManuscript(manuscript.id, !archived);
    useRefresh.getState().bump();
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-snug text-content">{manuscript.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{t(`role.${manuscript.role}`)}</Badge>
            <Badge>{t(`mstatus.${manuscript.status}`)}</Badge>
            {archived && <Badge tone="neutral">{t("lv.archivedBadge")}</Badge>}
            {manuscript.venue_name && (
              <span className="text-2xs text-content-subtle">{manuscript.venue_name}</span>
            )}
            {manuscript.manuscript_id && (
              <span className="text-2xs text-content-subtle">#{manuscript.manuscript_id}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" onClick={toggleArchive} title={archived ? t("lv.unarchive") : t("lv.archive")}>
            {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </Button>
          <Button variant="ghost" onClick={onEdit}>
            <Pencil size={14} />
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {manuscript.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-xs text-content-muted">
          {manuscript.notes}
        </p>
      )}

      <div className="mt-4 mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">
          {t("rev.rounds")}
        </h3>
        <Button onClick={() => setRoundForm({ open: true })}>
          <Plus size={13} /> {t("rev.addRound")}
        </Button>
      </div>

      {rounds.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-2xs text-content-subtle">
          {t("rev.noRounds")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rounds.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-content">
                    {t("rev.round", { n: r.round })}
                  </span>
                  {r.recommendation && (
                    <Badge tone={RECT_TONE[r.recommendation] ?? "neutral"}>
                      {t(`rec.${r.recommendation}`)}
                    </Badge>
                  )}
                  {r.confidence != null && (
                    <span className="text-2xs text-content-subtle">
                      {t("rev.conf", { n: r.confidence })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.submitted_date ? (
                    <span className="text-2xs text-content-subtle">
                      {t("rev.submittedOn", { d: formatDate(r.submitted_date) })}
                    </span>
                  ) : (
                    r.due_date && (
                      <>
                        <span className="text-2xs text-content-subtle">
                          {t("rev.dueOn", { d: formatDeadline(r.due_date, "local") })}
                        </span>
                        <CountdownBadge iso={r.due_date} />
                      </>
                    )
                  )}
                  <Button variant="ghost" onClick={() => setRoundForm({ open: true, edit: r })}>
                    <Pencil size={12} />
                  </Button>
                  <Button variant="danger" onClick={() => removeRound(r)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              {r.comments && (
                <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-surface-sunken p-2.5 font-sans text-2xs leading-relaxed text-content-muted">
                  {r.comments}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}

      <RoundForm
        open={roundForm.open}
        manuscriptId={manuscript.id}
        nextRound={roundForm.edit?.round ?? nextRound}
        existing={roundForm.edit}
        onClose={() => setRoundForm({ open: false })}
      />
    </div>
  );
}
