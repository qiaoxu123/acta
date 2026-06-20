import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { ResizableBottom } from "@/components/layout/ResizableBottom";
import { Button } from "@/components/ui/controls";
import { Badge, CountdownBadge } from "@/components/ui/misc";
import { ListControls, type Option } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  archivePaper,
  deletePaper,
  deleteSubmission,
  listPapers,
  listSubmissions,
  paperDueMap,
} from "@/db/repositories/papers";
import type { Paper, PaperSubmission } from "@/db/types";
import { formatDate, formatDeadline } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc, cmpDue, cmpStr, useListView } from "@/lib/listview";
import { useRefresh } from "@/store/refresh";
import { PaperForm } from "./PaperForm";
import { SubmissionForm } from "./SubmissionForm";
import { PAPER_STATUSES, STATUS_TONE } from "./paperStatus";

type Row = Paper & { _due: string | null };

const DECISION_TONE: Record<string, "ok" | "warn" | "urgent" | "neutral" | "accent"> = {
  accept: "ok",
  minor: "ok",
  major: "warn",
  reject: "urgent",
  desk_reject: "urgent",
  pending: "accent",
};

const ROLE_ORDER = ["first", "corresponding", "advised", "coauthor"];
const roleRank = (r: string | null) => {
  const i = ROLE_ORDER.indexOf(r ?? "");
  return i < 0 ? ROLE_ORDER.length : i;
};

const GROUP_OPTIONS: Option[] = [
  { value: "role", labelKey: "col.role2" },
  { value: "status", labelKey: "lv.group.status" },
  { value: "target", labelKey: "lv.sort.target" },
];

const compare = (key: string, a: Row, b: Row) => {
  switch (key) {
    case "title":
      return cmpStr(a.title, b.title);
    case "target":
      return cmpStr(a.target_venue, b.target_venue) || cmpStr(a.title, b.title);
    case "due":
      return cmpDue(a._due, b._due);
    case "role":
      return roleRank(a.my_role) - roleRank(b.my_role) || cmpDesc(a.updated_at, b.updated_at);
    case "status":
      return (
        PAPER_STATUSES.indexOf(a.status) - PAPER_STATUSES.indexOf(b.status) ||
        cmpDesc(a.updated_at, b.updated_at)
      );
    default:
      return cmpDesc(a.updated_at, b.updated_at);
  }
};

export function PapersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [view, setView] = useListView("acta.lv.papers2", {
    sort: "status",
    group: "role",
    scope: "active",
  });
  const [papers, setPapers] = useState<Paper[]>([]);
  const [dueMap, setDueMap] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; edit?: Paper | null }>({ open: false });

  useEffect(() => {
    listPapers(view.scope).then(setPapers);
    paperDueMap().then(setDueMap);
  }, [tick, view.scope]);

  const groupOf = (key: string, p: Row) => {
    if (key === "target") return { key: p.target_venue || "—", label: p.target_venue || "—" };
    if (key === "role") {
      const r = p.my_role;
      return {
        key: r ?? "unset",
        label: r ? t(`prole.${r}`) : t("prole.unset"),
        order: roleRank(r),
      };
    }
    return { key: p.status, label: t(`pstatus.${p.status}`), order: PAPER_STATUSES.indexOf(p.status) };
  };

  const sections = useMemo(() => {
    const rows: Row[] = papers.map((p) => ({ ...p, _due: dueMap[p.id] ?? null }));
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [papers, dueMap, view.sort, view.group, t]);

  const byRole = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of papers) {
      const k = p.my_role ?? "unset";
      m[k] = (m[k] ?? 0) + 1;
    }
    return m;
  }, [papers]);

  const columns: Column<Row>[] = [
    {
      key: "title",
      label: t("col.title"),
      width: "minmax(0,1fr)",
      sortable: true,
      render: (p) => <span className="truncate font-medium text-content">{p.title}</span>,
    },
    {
      key: "target",
      label: t("col.target"),
      width: "150px",
      sortable: true,
      render: (p) => <span className="truncate text-content-muted">{p.target_venue || "—"}</span>,
    },
    {
      key: "status",
      label: t("col.status"),
      width: "104px",
      sortable: true,
      render: (p) => <Badge tone={STATUS_TONE[p.status]}>{t(`pstatus.${p.status}`)}</Badge>,
    },
    {
      key: "role",
      label: t("col.role2"),
      width: "96px",
      sortable: true,
      render: (p) =>
        p.my_role ? (
          <Badge tone="accent">{t(`prole.${p.my_role}`)}</Badge>
        ) : (
          <span className="text-content-subtle">—</span>
        ),
    },
    {
      key: "due",
      label: t("col.due"),
      width: "168px",
      sortable: true,
      align: "right",
      render: (p) =>
        p._due ? (
          <>
            <span className="text-2xs text-content-subtle">{formatDate(p._due)}</span>
            <CountdownBadge iso={p._due} />
          </>
        ) : (
          <span className="text-content-subtle">—</span>
        ),
    },
  ];

  const selected = papers.find((p) => p.id === id) ?? null;
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const remove = async (p: Paper) => {
    if (await confirmDialog(t("pap.confirmDelete", { title: p.title }))) {
      await deletePaper(p.id);
      useRefresh.getState().bump();
      if (id === p.id) navigate("/papers");
    }
  };

  return (
    <>
      <Toolbar
        title={t("pap.title")}
        subtitle={t("pap.count", { n: papers.length })}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> {t("pap.new")}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border bg-panel px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-content-muted">
            <span className="font-semibold text-content">
              {t("stats.total")} {papers.length}
            </span>
            {(["first", "corresponding", "advised", "coauthor"] as const).map((r) => (
              <span key={r}>
                {t(`prole.${r}`)}{" "}
                <span className="font-semibold text-content">{byRole[r] ?? 0}</span>
              </span>
            ))}
          </div>
          <div className="ml-auto w-72">
            <ListControls hideSort groupOptions={GROUP_OPTIONS} view={view} onChange={setView} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <DataTable
            columns={columns}
            sections={sections}
            sortKey={view.sort}
            onSort={(k) => setView({ sort: k })}
            getId={(p) => p.id}
            selectedId={id}
            onSelect={(rid) => navigate(`/papers/${rid}`)}
            collapsed={collapsed}
            onToggle={toggle}
            empty={
              <p className="px-3 py-8 text-center text-2xs text-content-subtle">
                {view.scope === "archived" ? t("lv.empty.archived") : t("pap.none")}
              </p>
            }
          />
        </div>

        {selected && (
          <ResizableBottom storageKey="acta.h.detail" defaultHeight={280}>
            <PaperDetail
              paper={selected}
              t={t}
              onEdit={() => setForm({ open: true, edit: selected })}
              onDelete={() => remove(selected)}
            />
          </ResizableBottom>
        )}
      </div>

      <PaperForm
        open={form.open}
        existing={form.edit}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`/papers/${savedId}`)}
      />
    </>
  );
}

function PaperDetail({
  paper,
  t,
  onEdit,
  onDelete,
}: {
  paper: Paper;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tick = useRefresh((s) => s.tick);
  const [subs, setSubs] = useState<PaperSubmission[]>([]);
  const [subForm, setSubForm] = useState<{ open: boolean; edit?: PaperSubmission | null }>(
    { open: false },
  );

  useEffect(() => {
    listSubmissions(paper.id).then(setSubs);
  }, [paper.id, tick]);

  const nextRound = subs.length ? Math.max(...subs.map((s) => s.round)) + 1 : 1;
  const archived = !!paper.archived_at;

  const removeSub = async (s: PaperSubmission) => {
    if (await confirmDialog(t("pap.confirmDeleteRound", { n: s.round }))) {
      await deleteSubmission(s.id);
      useRefresh.getState().bump();
    }
  };
  const toggleArchive = async () => {
    await archivePaper(paper.id, !archived);
    useRefresh.getState().bump();
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-snug text-content">{paper.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[paper.status]}>{t(`pstatus.${paper.status}`)}</Badge>
            {archived && <Badge tone="neutral">{t("lv.archivedBadge")}</Badge>}
            {paper.target_venue && (
              <span className="text-2xs text-content-subtle">→ {paper.target_venue}</span>
            )}
            {paper.started_date && (
              <span className="text-2xs text-content-subtle">
                {t("pap.since", { d: formatDate(paper.started_date) })}
              </span>
            )}
          </div>
          {paper.authors && <p className="mt-1 text-2xs text-content-subtle">{paper.authors}</p>}
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

      <div className="mt-2 flex flex-wrap gap-3">
        {paper.overleaf_url && (
          <a href={paper.overleaf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-2xs text-accent hover:underline">
            {t("pap.draft")} <ExternalLink size={11} />
          </a>
        )}
        {paper.repo_url && (
          <a href={paper.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-2xs text-accent hover:underline">
            {t("pap.code")} <ExternalLink size={11} />
          </a>
        )}
      </div>

      {paper.abstract && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-xs text-content-muted">
          {paper.abstract}
        </p>
      )}

      <div className="mt-4 mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">
          {t("pap.rounds")}
        </h3>
        <Button onClick={() => setSubForm({ open: true })}>
          <Plus size={13} /> {t("pap.addRound")}
        </Button>
      </div>

      {subs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-2xs text-content-subtle">
          {t("pap.noRounds")}
        </p>
      ) : (
        <ol className="relative space-y-2.5 border-l border-border pl-5">
          {subs.map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -left-[1.42rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-content">{t("pap.round", { n: s.round })}</span>
                    {s.decision && (
                      <Badge tone={DECISION_TONE[s.decision] ?? "neutral"}>{t(`dec.${s.decision}`)}</Badge>
                    )}
                    {s.venue_name && <span className="text-2xs text-content-subtle">{s.venue_name}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.revision_deadline && <CountdownBadge iso={s.revision_deadline} />}
                    <Button variant="ghost" onClick={() => setSubForm({ open: true, edit: s })}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="danger" onClick={() => removeSub(s)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-2xs text-content-subtle">
                  {s.submitted_date && <span>{t("pap.submittedOn", { d: formatDate(s.submitted_date) })}</span>}
                  {s.decision_date && <span>{t("pap.decidedOn", { d: formatDate(s.decision_date) })}</span>}
                  {s.revision_deadline && (
                    <span>{t("pap.revisionDueOn", { d: formatDeadline(s.revision_deadline, "local") })}</span>
                  )}
                </div>
                {s.reviewer_summary && (
                  <pre className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap rounded bg-surface-sunken p-2.5 font-sans text-2xs leading-relaxed text-content-muted">
                    {s.reviewer_summary}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <SubmissionForm
        open={subForm.open}
        paperId={paper.id}
        defaultVenue={paper.target_venue ?? ""}
        nextRound={subForm.edit?.round ?? nextRound}
        existing={subForm.edit}
        onClose={() => setSubForm({ open: false })}
      />
    </div>
  );
}
