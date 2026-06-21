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
  archiveProject,
  deleteProject,
  listProjects,
} from "@/db/repositories/projects";
import type { Project, ProjectCategory, ProjectStatus } from "@/db/types";
import { formatDate, formatDeadline } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc, cmpDue, cmpStr, useListView } from "@/lib/listview";
import { useRefresh } from "@/store/refresh";
import { ProjectForm } from "./ProjectForm";

type Row = Project & { _due: string | null };

const STATUS_ORDER: ProjectStatus[] = ["planning", "applying", "active", "completed", "rejected"];
const STATUS_TONE: Record<string, "neutral" | "accent" | "warn" | "ok" | "urgent"> = {
  planning: "neutral",
  applying: "accent",
  active: "ok",
  completed: "neutral",
  rejected: "urgent",
};

const GROUP_OPTIONS: Option[] = [
  { value: "status", labelKey: "col.projStatus" },
  { value: "level", labelKey: "col.projLevel" },
];

const compare = (key: string, a: Row, b: Row) => {
  switch (key) {
    case "name":
      return cmpStr(a.name, b.name);
    case "due":
      return cmpDue(a._due, b._due);
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || cmpDue(a._due, b._due);
    default:
      return cmpDesc(a.updated_at, b.updated_at);
  }
};

export function ProjectsPage({ category }: { category: ProjectCategory }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const base = `/projects/${category}`;

  const [view, setView] = useListView(`acta.lv.proj.${category}`, {
    sort: "status",
    group: "status",
    scope: "active",
  });
  const [items, setItems] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; edit?: Project | null }>({ open: false });

  useEffect(() => {
    listProjects(view.scope).then((all) => setItems(all.filter((p) => p.category === category)));
  }, [tick, view.scope, category]);

  const groupOf = (key: string, p: Row) => {
    if (key === "level")
      return { key: p.level || "—", label: p.level ? t(`plevel.${p.level}`) : "—" };
    return { key: p.status, label: t(`pstatus2.${p.status}`), order: STATUS_ORDER.indexOf(p.status) };
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: Row[] = items
      .map((p) => ({ ...p, _due: p.apply_deadline }))
      .filter((p) =>
        !q ? true : [p.name, p.program, p.agency, p.number].filter(Boolean).some((s) => s!.toLowerCase().includes(q)),
      );
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [items, query, view.sort, view.group, t]);

  const columns: Column<Row>[] = [
    { key: "name", label: t("projf.name"), width: "minmax(0,1fr)", sortable: true, render: (p) => <span className="truncate font-medium text-content">{p.name}</span> },
    { key: "program", label: t("col.projProgram"), width: "130px", render: (p) => <span className="truncate text-content-muted">{p.program || "—"}</span> },
    { key: "level", label: t("col.projLevel"), width: "88px", render: (p) => (p.level ? <Badge>{t(`plevel.${p.level}`)}</Badge> : <span className="text-content-subtle">—</span>) },
    { key: "status", label: t("col.projStatus"), width: "92px", sortable: true, render: (p) => <Badge tone={STATUS_TONE[p.status]}>{t(`pstatus2.${p.status}`)}</Badge> },
    { key: "role", label: t("col.projRole"), width: "64px", render: (p) => (p.pi_role ? <Badge tone="accent">{t(`prole3.${p.pi_role}`)}</Badge> : <span className="text-content-subtle">—</span>) },
    {
      key: "due",
      label: t("col.projDue"),
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

  const selected = items.find((p) => p.id === id) ?? null;
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const remove = async (p: Project) => {
    if (await confirmDialog(t("proj.confirmDelete", { name: p.name }))) {
      await deleteProject(p.id);
      useRefresh.getState().bump();
      if (id === p.id) navigate(base);
    }
  };

  const title = category === "vertical" ? t("nav.projects.vertical") : t("nav.projects.horizontal");

  return (
    <>
      <Toolbar
        title={title}
        subtitle={t("proj.count", { n: items.length })}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> {t("proj.new")}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-panel px-2 py-1.5">
          <div className="relative w-56">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
            <TextInput className="pl-7" placeholder={t("rev.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="ml-auto w-64">
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
            getId={(p) => p.id}
            selectedId={id}
            onSelect={(rid) => navigate(`${base}/${rid}`)}
            collapsed={collapsed}
            onToggle={toggle}
            empty={
              <p className="px-3 py-8 text-center text-2xs text-content-subtle">
                {view.scope === "archived" ? t("lv.empty.archived") : t("proj.none")}
              </p>
            }
          />
        </div>

        {selected && (
          <ResizableRight storageKey="acta.w.detail" defaultWidth={440}>
            <ProjectDetail
              project={selected}
              t={t}
              onEdit={() => setForm({ open: true, edit: selected })}
              onDelete={() => remove(selected)}
            />
          </ResizableRight>
        )}
        </div>
      </div>

      <ProjectForm
        open={form.open}
        existing={form.edit}
        defaultCategory={category}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`${base}/${savedId}`)}
      />
    </>
  );
}

function field(label: string, value: string | null) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-content-subtle">{label}</span>
      <span className="text-content-muted">{value}</span>
    </div>
  );
}

function ProjectDetail({
  project,
  t,
  onEdit,
  onDelete,
}: {
  project: Project;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const archived = !!project.archived_at;
  const toggleArchive = async () => {
    await archiveProject(project.id, !archived);
    useRefresh.getState().bump();
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-snug text-content">{project.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{t(`pcat.${project.category}`)}</Badge>
            {project.level && <Badge>{t(`plevel.${project.level}`)}</Badge>}
            <Badge tone={STATUS_TONE[project.status]}>{t(`pstatus2.${project.status}`)}</Badge>
            {project.pi_role && <Badge>{t(`prole3.${project.pi_role}`)}</Badge>}
            {archived && <Badge tone="neutral">{t("lv.archivedBadge")}</Badge>}
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

      <div className="mt-3 space-y-1 text-xs">
        {field(t("projf.program"), project.program)}
        {field(t("projf.agency"), project.agency)}
        {field(t("projf.number"), project.number)}
        {field(t("projf.amount"), project.amount)}
        {field(
          t("projf.applyDeadline"),
          project.apply_deadline ? formatDeadline(project.apply_deadline, "local") : null,
        )}
        {field(
          t("projf.startDate") + " ~ " + t("projf.endDate"),
          project.start_date || project.end_date
            ? `${project.start_date ? formatDate(project.start_date) : "?"} ~ ${project.end_date ? formatDate(project.end_date) : "?"}`
            : null,
        )}
      </div>

      {project.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-xs text-content-muted">
          {project.notes}
        </p>
      )}
    </div>
  );
}
