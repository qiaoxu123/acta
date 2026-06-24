import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, Select, TextInput, Textarea } from "@/components/ui/controls";
import { Badge } from "@/components/ui/misc";
import { Ext } from "@/components/ui/Ext";
import { Markdown } from "@/components/ui/Markdown";
import { ListControls, type Option } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  archiveIdea,
  deleteIdea,
  deleteIdeaLog,
  listIdeaLogs,
  listIdeas,
  updateIdeaLog,
} from "@/db/repositories/ideas";
import type { Idea, IdeaLog, IdeaLogKind, IdeaStatus } from "@/db/types";
import { formatDate } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc, cmpStr, useListView } from "@/lib/listview";
import { itemHref } from "@/lib/tabs";
import { useRefresh } from "@/store/refresh";
import { IdeaForm } from "./IdeaForm";
import { IdeaLogForm } from "./IdeaLogForm";

// Lifecycle order: live work first, settled/closed last.
const STATUS_ORDER: IdeaStatus[] = [
  "building",
  "exploring",
  "validated",
  "spark",
  "paused",
  "done",
  "merged",
  "dropped",
];
const STATUS_TONE: Record<string, "neutral" | "accent" | "warn" | "ok" | "urgent"> = {
  spark: "neutral",
  exploring: "accent",
  validated: "ok",
  building: "warn",
  done: "ok",
  paused: "neutral",
  merged: "neutral",
  dropped: "urgent",
};
const CAT_ORDER = ["idea", "experiment", "course", "hardware", "simulation", "paper", "infra"];
const LOG_TONE: Record<string, "neutral" | "accent" | "warn" | "ok"> = {
  note: "neutral",
  finding: "accent",
  decision: "warn",
  progress: "ok",
};
const LOG_KINDS: IdeaLogKind[] = ["note", "finding", "decision", "progress"];
// Git-graph node colour per event kind (the coloured dot on the rail).
const LOG_NODE: Record<string, string> = {
  note: "bg-content-subtle",
  finding: "bg-accent",
  decision: "bg-amber-500",
  progress: "bg-emerald-500",
};

const GROUP_OPTIONS: Option[] = [
  { value: "status", labelKey: "lv.group.status" },
  { value: "category", labelKey: "lv.group.ideaCat" },
];

const compare = (key: string, a: Idea, b: Idea) => {
  switch (key) {
    case "title":
      return cmpStr(a.title, b.title);
    case "category":
      return CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category) || cmpStr(a.title, b.title);
    case "status":
      return (
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        b.priority - a.priority ||
        cmpDesc(a.updated_at, b.updated_at)
      );
    default:
      return b.priority - a.priority || cmpDesc(a.updated_at, b.updated_at);
  }
};

export function IdeasPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [view, setView] = useListView("acta.lv.ideas", {
    sort: "status",
    group: "status",
    scope: "active",
  });
  const [items, setItems] = useState<Idea[]>([]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; edit?: Idea | null }>({ open: false });

  useEffect(() => {
    listIdeas(view.scope).then(setItems);
  }, [tick, view.scope]);

  // When grouped by status, keep settled buckets collapsed by default.
  useEffect(() => {
    setCollapsed(
      view.group === "status" ? new Set(["done", "merged", "dropped"]) : new Set(),
    );
  }, [view.group]);

  const groupOf = (key: string, x: Idea) => {
    if (key === "category")
      return {
        key: x.category,
        label: t(`icat.${x.category}`),
        order: CAT_ORDER.indexOf(x.category),
      };
    return {
      key: x.status,
      label: t(`istatus.${x.status}`),
      order: STATUS_ORDER.indexOf(x.status),
    };
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((x) =>
      !q
        ? true
        : [x.title, x.summary, x.tags].filter(Boolean).some((s) => s!.toLowerCase().includes(q)),
    );
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [items, query, view.sort, view.group, t]);

  const columns: Column<Idea>[] = [
    {
      key: "title",
      label: t("ideaf.title"),
      width: "minmax(0,1fr)",
      sortable: true,
      render: (x) => (
        <span className="flex min-w-0 items-center gap-1.5">
          {x.priority === 1 && <Star size={12} className="shrink-0 fill-current text-amber-500" />}
          <span className="truncate font-medium text-content">{x.title}</span>
        </span>
      ),
    },
    {
      key: "summary",
      label: t("ideaf.summary"),
      width: "minmax(0,1.1fr)",
      render: (x) => <span className="truncate text-content-muted">{x.summary || "—"}</span>,
    },
    {
      key: "category",
      label: t("col.ideaCat"),
      width: "100px",
      sortable: true,
      render: (x) => <Badge tone="neutral">{t(`icat.${x.category}`)}</Badge>,
    },
    {
      key: "status",
      label: t("col.ideaStatus"),
      width: "100px",
      sortable: true,
      render: (x) => <Badge tone={STATUS_TONE[x.status]}>{t(`istatus.${x.status}`)}</Badge>,
    },
  ];

  const selected = items.find((x) => x.id === id) ?? null;
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const openItem = (rid: string) => navigate(itemHref("ideas", rid));

  const remove = async (x: Idea) => {
    if (await confirmDialog(t("idea.confirmDelete", { title: x.title }))) {
      await deleteIdea(x.id);
      useRefresh.getState().bump();
      if (id === x.id) navigate("/ideas");
    }
  };

  return (
    <>
      <Toolbar
        title={t("ideas.title")}
        subtitle={t("ideas.count", { n: items.length })}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> {t("ideas.new")}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-panel px-2 py-1.5">
          <div className="relative w-56">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
            <TextInput
              className="pl-7"
              placeholder={t("ideas.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ml-auto w-64">
            <ListControls hideSort groupOptions={GROUP_OPTIONS} view={view} onChange={setView} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto">
            <DataTable
              storageKey="ideas"
              columns={columns}
              sections={sections}
              sortKey={view.sort}
              onSort={(k) => setView({ sort: k })}
              getId={(x) => x.id}
              selectedId={id}
              onSelect={openItem}
              collapsed={collapsed}
              onToggle={toggle}
              empty={
                <p className="px-3 py-8 text-center text-2xs text-content-subtle">
                  {view.scope === "archived" ? t("lv.empty.archived") : t("ideas.none")}
                </p>
              }
            />
          </div>

          <DockPanel
            selected={!!selected}
            onOpenInTab={selected ? () => openItem(selected.id) : undefined}
          >
            {selected && (
              <IdeaDetail
                idea={selected}
                t={t}
                onEdit={() => setForm({ open: true, edit: selected })}
                onDelete={() => remove(selected)}
              />
            )}
          </DockPanel>
        </div>
      </div>

      <IdeaForm
        open={form.open}
        existing={form.edit}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`/ideas/item/${savedId}`)}
      />
    </>
  );
}

export function IdeaDetail({
  idea,
  t,
  onEdit,
  onDelete,
  wide = false,
}: {
  idea: Idea;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
  /** Full-width item page: render the log timeline as a master/detail sidebar
   *  instead of a stack of full-width text blocks. */
  wide?: boolean;
}) {
  const tick = useRefresh((s) => s.tick);
  const [logs, setLogs] = useState<IdeaLog[]>([]);
  const [logForm, setLogForm] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{ kind: IdeaLogKind; body: string }>({
    kind: "note",
    body: "",
  });
  const archived = !!idea.archived_at;
  const tags = (idea.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  useEffect(() => {
    listIdeaLogs(idea.id).then((ls) => {
      setLogs(ls);
      // Keep the current selection if it survives a refresh; else select newest.
      setSelId((cur) => (cur && ls.some((l) => l.id === cur) ? cur : ls.at(-1)?.id ?? null));
    });
  }, [idea.id, tick]);

  // Leave edit mode whenever the selected entry (or the idea) changes.
  useEffect(() => {
    setEditing(false);
  }, [selId, idea.id]);

  const startEdit = (l: IdeaLog) => {
    setDraft({ kind: l.kind, body: l.body });
    setEditing(true);
  };
  const saveEdit = async (l: IdeaLog) => {
    if (!draft.body.trim()) return;
    await updateIdeaLog(l.id, { kind: draft.kind, body: draft.body.trim() });
    setEditing(false);
    useRefresh.getState().bump();
  };

  const toggleArchive = async () => {
    await archiveIdea(idea.id, !archived);
    useRefresh.getState().bump();
  };
  const removeLog = async (l: IdeaLog) => {
    if (await confirmDialog(t("idea.confirmDeleteLog"))) {
      await deleteIdeaLog(l.id);
      useRefresh.getState().bump();
    }
  };

  // One coloured rail node per event (decisions are diamonds), with the
  // connecting line to the next node below.
  const railNode = (l: IdeaLog, last: boolean) => (
    <div className="relative flex w-3 shrink-0 flex-col items-center pt-1.5">
      <span
        className={clsx(
          "z-10 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-surface",
          l.kind === "decision" && "rotate-45 rounded-[2px]",
          LOG_NODE[l.kind] ?? "bg-content-subtle",
        )}
      />
      {!last && <span className="-mb-1 w-px flex-1 bg-border" />}
    </div>
  );

  const header = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold leading-snug text-content">{idea.title}</h2>
        {idea.summary && <p className="mt-1 text-xs text-content-muted">{idea.summary}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral">{t(`icat.${idea.category}`)}</Badge>
          <Badge tone={STATUS_TONE[idea.status]}>{t(`istatus.${idea.status}`)}</Badge>
          {idea.priority === 1 && (
            <Badge tone="warn">
              <Star size={10} className="mr-0.5 fill-current" />
              {t("ideaf.priority")}
            </Badge>
          )}
          {archived && <Badge tone="neutral">{t("lv.archivedBadge")}</Badge>}
        </div>
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((tg) => (
              <span key={tg} className="rounded bg-surface-sunken px-1.5 py-0.5 text-2xs text-content-subtle">
                #{tg}
              </span>
            ))}
          </div>
        )}
        {idea.repo_url && (
          <Ext
            href={idea.repo_url}
            className="mt-2 inline-flex items-center gap-1 text-2xs text-accent hover:underline"
          >
            <ExternalLink size={12} /> {t("idea.openRepo")}
          </Ext>
        )}
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
  );

  const notes = idea.notes && (
    <div className="mt-3 max-h-56 overflow-y-auto rounded-md bg-surface-sunken px-3 py-1">
      <Markdown source={idea.notes} />
    </div>
  );

  const logsTitle = (
    <div className="flex items-center justify-between">
      <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">
        {t("idea.logs")}
      </h3>
      <Button onClick={() => setLogForm(true)}>
        <Plus size={13} /> {t("idea.addLog")}
      </Button>
    </div>
  );

  const emptyLogs = (
    <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-2xs text-content-subtle">
      {t("idea.noLogs")}
    </p>
  );

  const reversed = [...logs].reverse(); // newest first
  const logForm_ = <IdeaLogForm open={logForm} ideaId={idea.id} onClose={() => setLogForm(false)} />;

  // --- Narrow (dock panel): stacked git-graph timeline -----------------------
  if (!wide) {
    return (
      <div className="p-4">
        {header}
        {notes}
        <div className="mt-4 mb-2">{logsTitle}</div>
        {logs.length === 0 ? (
          emptyLogs
        ) : (
          <ol className="ml-1">
            {reversed.map((l, i, arr) => (
              <li key={l.id} className="group flex gap-3">
                {railNode(l, i === arr.length - 1)}
                <div className="min-w-0 flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <Badge tone={LOG_TONE[l.kind] ?? "neutral"}>{t(`ilogkind.${l.kind}`)}</Badge>
                    <span className="text-2xs text-content-subtle">{formatDate(l.created_at)}</span>
                    <Button
                      variant="danger"
                      className="ml-auto opacity-0 transition group-hover:opacity-100"
                      onClick={() => removeLog(l)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  <pre className="mt-1.5 whitespace-pre-wrap rounded bg-surface-sunken p-2.5 font-sans text-2xs leading-relaxed text-content-muted">
                    {l.body}
                  </pre>
                </div>
              </li>
            ))}
          </ol>
        )}
        {logForm_}
      </div>
    );
  }

  // --- Wide (item page): timeline sidebar + selected-entry reading pane ------
  const sel = logs.find((l) => l.id === selId) ?? null;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border p-4">
        {header}
        {notes}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-2 pt-3">
        <div className="mb-2 shrink-0">{logsTitle}</div>
        {logs.length === 0 ? (
          emptyLogs
        ) : (
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-border">
            {/* left: git-graph timeline, compact + selectable */}
            <ol className="w-72 shrink-0 overflow-y-auto border-r border-border bg-surface-sunken/40 p-2">
              {reversed.map((l, i, arr) => (
                <li key={l.id} className="flex gap-2.5">
                  {railNode(l, i === arr.length - 1)}
                  <button
                    onClick={() => setSelId(l.id)}
                    className={clsx(
                      "mb-1 min-w-0 flex-1 rounded-md px-2 py-1.5 text-left transition-colors",
                      selId === l.id ? "bg-accent-soft" : "hover:bg-surface-raised",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <Badge tone={LOG_TONE[l.kind] ?? "neutral"}>{t(`ilogkind.${l.kind}`)}</Badge>
                      <span className="text-2xs text-content-subtle">{formatDate(l.created_at)}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-2xs leading-relaxed text-content-muted">
                      {l.body}
                    </p>
                  </button>
                </li>
              ))}
            </ol>
            {/* right: full body of the selected entry — view or inline edit */}
            <div className="min-w-0 flex-1 overflow-y-auto p-4">
              {sel && !editing && (
                <>
                  <div className="flex items-center gap-2">
                    <Badge tone={LOG_TONE[sel.kind] ?? "neutral"}>{t(`ilogkind.${sel.kind}`)}</Badge>
                    <span className="text-2xs text-content-subtle">{formatDate(sel.created_at)}</span>
                    <Button
                      variant="ghost"
                      className="ml-auto"
                      title={t("idea.editLog")}
                      onClick={() => startEdit(sel)}
                    >
                      <Pencil size={12} />
                    </Button>
                    <Button variant="danger" onClick={() => removeLog(sel)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                  {/* Double-click the text to start editing, like a note app. */}
                  <div onDoubleClick={() => startEdit(sel)} className="cursor-text">
                    <Markdown source={sel.body} className="mt-3 max-w-3xl" />
                  </div>
                </>
              )}
              {sel && editing && (
                <div className="flex max-w-3xl flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Select
                      className="w-32"
                      value={draft.kind}
                      onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as IdeaLogKind }))}
                    >
                      {LOG_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {t(`ilogkind.${k}`)}
                        </option>
                      ))}
                    </Select>
                    <span className="text-2xs text-content-subtle">{t("idea.markdownHint")}</span>
                    <Button className="ml-auto" onClick={() => setEditing(false)}>
                      {t("common.cancel")}
                    </Button>
                    <Button variant="primary" onClick={() => saveEdit(sel)}>
                      {t("common.save")}
                    </Button>
                  </div>
                  <Textarea
                    autoFocus
                    className="min-h-[60vh] font-mono text-xs leading-relaxed"
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                        e.preventDefault();
                        saveEdit(sel);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {logForm_}
    </div>
  );
}
