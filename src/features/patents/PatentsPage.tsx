import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge } from "@/components/ui/misc";
import { ListControls, type Option } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  archivePatent,
  deletePatent,
  listPatents,
} from "@/db/repositories/patents";
import type { Patent, PatentStatus } from "@/db/types";
import { formatDate } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc, cmpStr, useListView } from "@/lib/listview";
import { itemTab, itemTabId } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";
import { useRefresh } from "@/store/refresh";
import { PatentForm } from "./PatentForm";

const STATUS_ORDER: PatentStatus[] = ["drafting", "filed", "substantive", "granted", "rejected"];
const STATUS_TONE: Record<string, "neutral" | "accent" | "warn" | "ok" | "urgent"> = {
  drafting: "neutral",
  filed: "accent",
  substantive: "warn",
  granted: "ok",
  rejected: "urgent",
};

const GROUP_OPTIONS: Option[] = [
  { value: "status", labelKey: "col.patStatus" },
  { value: "type", labelKey: "col.patType" },
];

const compare = (key: string, a: Patent, b: Patent) => {
  switch (key) {
    case "title":
      return cmpStr(a.title, b.title);
    case "type":
      return cmpStr(a.type, b.type) || cmpStr(a.title, b.title);
    case "appdate":
      return cmpDesc(a.app_date, b.app_date);
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || cmpDesc(a.updated_at, b.updated_at);
    default:
      return cmpDesc(a.updated_at, b.updated_at);
  }
};

export function PatentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [view, setView] = useListView("acta.lv.patents", {
    sort: "status",
    group: "status",
    scope: "active",
  });
  const [items, setItems] = useState<Patent[]>([]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; edit?: Patent | null }>({ open: false });

  useEffect(() => {
    listPatents(view.scope).then(setItems);
  }, [tick, view.scope]);

  const groupOf = (key: string, p: Patent) => {
    if (key === "type") return { key: p.type, label: t(`ptype.${p.type}`) };
    return { key: p.status, label: t(`pstat.${p.status}`), order: STATUS_ORDER.indexOf(p.status) };
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((p) =>
      !q ? true : [p.title, p.app_number, p.inventors].filter(Boolean).some((s) => s!.toLowerCase().includes(q)),
    );
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [items, query, view.sort, view.group, t]);

  const columns: Column<Patent>[] = [
    { key: "title", label: t("patf.title"), width: "minmax(0,1fr)", sortable: true, render: (p) => <span className="truncate font-medium text-content">{p.title}</span> },
    { key: "type", label: t("col.patType"), width: "108px", sortable: true, render: (p) => <Badge>{t(`ptype.${p.type}`)}</Badge> },
    { key: "status", label: t("col.patStatus"), width: "112px", sortable: true, render: (p) => <Badge tone={STATUS_TONE[p.status]}>{t(`pstat.${p.status}`)}</Badge> },
    { key: "appno", label: t("col.patNo"), width: "150px", render: (p) => <span className="truncate text-content-muted">{p.app_number || "—"}</span> },
    { key: "appdate", label: t("col.patDate"), width: "110px", sortable: true, align: "right", render: (p) => <span className="text-content-subtle">{p.app_date ? formatDate(p.app_date) : "—"}</span> },
  ];

  const selected = items.find((p) => p.id === id) ?? null;
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const openItem = (rid: string) => {
    const p = items.find((x) => x.id === rid);
    const tab = itemTab("patents", rid, p?.title ?? "");
    useTabs.getState().openTab(tab);
    navigate(tab.href);
  };

  const remove = async (p: Patent) => {
    if (await confirmDialog(t("pat.confirmDelete", { title: p.title }))) {
      await deletePatent(p.id);
      useTabs.getState().closeTab(itemTabId("patents", p.id));
      useRefresh.getState().bump();
      if (id === p.id) navigate("/patents");
    }
  };

  return (
    <>
      <Toolbar
        title={t("nav.patents")}
        subtitle={t("pat.count", { n: items.length })}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> {t("pat.new")}
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
            onSelect={openItem}
            collapsed={collapsed}
            onToggle={toggle}
            empty={
              <p className="px-3 py-8 text-center text-2xs text-content-subtle">
                {view.scope === "archived" ? t("lv.empty.archived") : t("pat.none")}
              </p>
            }
          />
        </div>

        <DockPanel
          selected={!!selected}
          onOpenInTab={selected ? () => openItem(selected.id) : undefined}
        >
          {selected && (
            <PatentDetail
              patent={selected}
              t={t}
              onEdit={() => setForm({ open: true, edit: selected })}
              onDelete={() => remove(selected)}
            />
          )}
        </DockPanel>
        </div>
      </div>

      <PatentForm
        open={form.open}
        existing={form.edit}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`/patents/item/${savedId}`)}
      />
    </>
  );
}

function row(label: string, value: string | null) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-content-subtle">{label}</span>
      <span className="text-content-muted">{value}</span>
    </div>
  );
}

export function PatentDetail({
  patent,
  t,
  onEdit,
  onDelete,
}: {
  patent: Patent;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const archived = !!patent.archived_at;
  const toggleArchive = async () => {
    await archivePatent(patent.id, !archived);
    useRefresh.getState().bump();
  };
  const STATUS_TONE2 = STATUS_TONE;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-snug text-content">{patent.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge>{t(`ptype.${patent.type}`)}</Badge>
            <Badge tone={STATUS_TONE2[patent.status]}>{t(`pstat.${patent.status}`)}</Badge>
            {patent.my_role && (
              <Badge tone="accent">{t(`prole2.${patent.my_role}`)}</Badge>
            )}
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
        {row(t("patf.appNumber"), patent.app_number)}
        {row(t("patf.appDate"), patent.app_date ? formatDate(patent.app_date) : null)}
        {row(t("patf.pubNumber"), patent.pub_number)}
        {row(t("patf.grantNumber"), patent.grant_number)}
        {row(t("patf.inventors"), patent.inventors)}
      </div>

      {patent.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-xs text-content-muted">
          {patent.notes}
        </p>
      )}
    </div>
  );
}
