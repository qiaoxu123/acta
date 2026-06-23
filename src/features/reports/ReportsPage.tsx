import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import {
  Archive,
  ArchiveRestore,
  CalendarRange,
  Copy,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, Textarea } from "@/components/ui/controls";
import { Badge } from "@/components/ui/misc";
import { Markdown } from "@/components/ui/Markdown";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  aggregateWeek,
  archiveReport,
  deleteReport,
  listReports,
  updateReport,
} from "@/db/repositories/reports";
import type { Report } from "@/db/types";
import { formatDate } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc } from "@/lib/listview";
import { itemHref } from "@/lib/tabs";
import { useRefresh } from "@/store/refresh";
import { ReportForm } from "./ReportForm";
import { composeBody } from "./draft";

const compare = (_k: string, a: Report, b: Report) =>
  cmpDesc(a.period_start ?? a.created_at, b.period_start ?? b.created_at);

const period = (r: Report) =>
  r.period_start && r.period_end ? `${r.period_start} ~ ${r.period_end}` : "—";

export function ReportsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [items, setItems] = useState<Report[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; edit?: Report | null }>({ open: false });

  useEffect(() => {
    listReports("active").then(setItems);
  }, [tick]);

  const sections = useMemo(
    () =>
      arrange(items, "period", "month", compare, (_k, r) => {
        const m = (r.period_start ?? r.created_at).slice(0, 7);
        return { key: m, label: m };
      }),
    [items],
  );

  const columns: Column<Report>[] = [
    {
      key: "title",
      label: t("report.title"),
      width: "minmax(0,1fr)",
      render: (r) => <span className="truncate font-medium text-content">{r.title}</span>,
    },
    {
      key: "period",
      label: t("report.period"),
      width: "180px",
      render: (r) => <span className="text-2xs text-content-subtle">{period(r)}</span>,
    },
    {
      key: "updated",
      label: t("note.updated"),
      width: "104px",
      align: "right",
      render: (r) => <span className="text-2xs text-content-subtle">{formatDate(r.updated_at)}</span>,
    },
  ];

  const selected = items.find((r) => r.id === id) ?? null;
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  const openItem = (rid: string) => navigate(itemHref("reports", rid));

  const remove = async (r: Report) => {
    if (await confirmDialog(t("report.confirmDelete", { title: r.title }))) {
      await deleteReport(r.id);
      useRefresh.getState().bump();
      if (id === r.id) navigate("/reports");
    }
  };

  return (
    <>
      <Toolbar
        title={t("reports.title")}
        subtitle={t("reports.count", { n: items.length })}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> {t("reports.newWeek")}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-auto">
          <DataTable
            storageKey="reports"
            columns={columns}
            sections={sections}
            sortKey="period"
            onSort={() => {}}
            getId={(r) => r.id}
            selectedId={id}
            onSelect={openItem}
            collapsed={collapsed}
            onToggle={toggle}
            empty={
              <p className="px-3 py-8 text-center text-2xs text-content-subtle">{t("reports.none")}</p>
            }
          />
        </div>

        <DockPanel selected={!!selected} onOpenInTab={selected ? () => openItem(selected.id) : undefined}>
          {selected && (
            <ReportDetail
              report={selected}
              t={t}
              onEdit={() => setForm({ open: true, edit: selected })}
              onDelete={() => remove(selected)}
            />
          )}
        </DockPanel>
      </div>

      <ReportForm
        open={form.open}
        existing={form.edit}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`/reports/item/${savedId}`)}
      />
    </>
  );
}

export function ReportDetail({
  report,
  t,
  onEdit,
  onDelete,
  wide = false,
}: {
  report: Report;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
  wide?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const archived = !!report.archived_at;

  useEffect(() => {
    setEditing(false);
  }, [report.id]);

  const fullMd = `# ${report.title}\n\n${report.body ?? ""}`;

  const copy = async () => {
    await navigator.clipboard.writeText(fullMd);
    setNote(t("report.copied"));
  };
  const exportMd = async () => {
    const path = await saveDialog({
      defaultPath: `${report.title}.md`,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    if (!path) return;
    await writeTextFile(path, fullMd);
    setNote(t("report.exported"));
  };
  const reaggregate = async () => {
    if (!report.period_start || !report.period_end) return;
    if (!(await confirmDialog(t("report.confirmAggregate")))) return;
    const startISO = new Date(`${report.period_start}T00:00:00`).toISOString();
    const end = new Date(`${report.period_end}T00:00:00`);
    end.setDate(end.getDate() + 1);
    const agg = await aggregateWeek({
      startDate: report.period_start,
      endDate: report.period_end,
      startISO,
      endISO: end.toISOString(),
    });
    await updateReport(report.id, { body: composeBody(t, agg) });
    useRefresh.getState().bump();
  };
  const toggleArchive = async () => {
    await archiveReport(report.id, !archived);
    useRefresh.getState().bump();
  };
  const startEdit = () => {
    setDraft(report.body ?? "");
    setEditing(true);
  };
  const saveEdit = async () => {
    await updateReport(report.id, { body: draft });
    setEditing(false);
    useRefresh.getState().bump();
  };

  return (
    <div className={wide ? "mx-auto max-w-3xl p-5" : "p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-snug text-content">{report.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">
              <CalendarRange size={10} className="mr-0.5" />
              {period(report)}
            </Badge>
            {archived && <Badge tone="neutral">{t("lv.archivedBadge")}</Badge>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <Button variant="ghost" onClick={copy} title={t("report.copy")}>
            <Copy size={14} />
          </Button>
          <Button variant="ghost" onClick={exportMd} title={t("report.export")}>
            <Download size={14} />
          </Button>
          {report.period_start && (
            <Button variant="ghost" onClick={reaggregate} title={t("report.aggregate")}>
              <RefreshCw size={14} />
            </Button>
          )}
          <Button variant="ghost" onClick={toggleArchive} title={archived ? t("lv.unarchive") : t("lv.archive")}>
            {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </Button>
          <Button variant="ghost" onClick={onEdit} title={t("report.editMeta")}>
            <Pencil size={14} />
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {note && <p className="mt-2 rounded bg-surface-sunken px-2 py-1 text-2xs text-content-muted">{note}</p>}

      <div className="mt-3">
        {wide && editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xs text-content-subtle">{t("idea.markdownHint")}</span>
              <Button className="ml-auto" onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onClick={saveEdit}>
                {t("common.save")}
              </Button>
            </div>
            <Textarea
              autoFocus
              className="min-h-[60vh] font-mono text-xs leading-relaxed"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  saveEdit();
                }
              }}
            />
          </div>
        ) : report.body?.trim() ? (
          <div onDoubleClick={wide ? startEdit : undefined} className={wide ? "cursor-text" : ""}>
            <Markdown source={report.body} />
          </div>
        ) : (
          <p className="text-2xs text-content-subtle">{t("report.empty")}</p>
        )}
        {wide && !editing && (
          <Button className="mt-3" onClick={startEdit}>
            <Pencil size={13} /> {t("note.editBody")}
          </Button>
        )}
      </div>
    </div>
  );
}
