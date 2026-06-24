import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge } from "@/components/ui/misc";
import { ListControls, type Option } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { deleteFunding, listFunding } from "@/db/repositories/funding";
import type { Funding } from "@/db/repositories/funding";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc, cmpStr, useListView } from "@/lib/listview";
import { useRefresh } from "@/store/refresh";
import { FundingForm } from "./FundingForm";

const EMPTY = new Set<string>();
const CAT_ORDER = ["grant", "contract", "other"];
const STATUS_ORDER = ["active", "completed", "closed"];
const STATUS_TONE: Record<string, "neutral" | "accent" | "ok" | "warn" | "urgent"> = {
  active: "ok",
  completed: "neutral",
  closed: "urgent",
};

const GROUP_OPTIONS: Option[] = [
  { value: "category", labelKey: "col.fundingCat" },
  { value: "status", labelKey: "lv.group.status" },
];

const compare = (key: string, a: Funding, b: Funding) => {
  switch (key) {
    case "title": return cmpStr(a.title, b.title);
    case "source": return cmpStr(a.source ?? "", b.source ?? "") || cmpStr(a.title, b.title);
    case "amount": return (b.total_amount ?? 0) - (a.total_amount ?? 0);
    case "balance": return (b.balance ?? 0) - (a.balance ?? 0);
    default: return cmpDesc(a.updated_at, b.updated_at);
  }
};

export function FundingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [view, setView] = useListView("acta.lv.funding", { sort: "updated", group: "category", scope: "active" });
  const [items, setItems] = useState<Funding[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<{ open: boolean; edit?: Funding | null }>({ open: false });

  useEffect(() => { listFunding("active").then(setItems); }, [tick]);

  const groupOf = (key: string, f: Funding) => {
    if (key === "status") return { key: f.status, label: t(`funding.status.${f.status}`), order: STATUS_ORDER.indexOf(f.status) };
    return { key: f.category, label: t(`funding.cat.${f.category}`), order: CAT_ORDER.indexOf(f.category) };
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((f) =>
      !q || [f.title, f.source, f.number].filter(Boolean).some((s) => s!.toLowerCase().includes(q)),
    );
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [items, query, view.sort, view.group, t]);

  const fmt = (n: number | null | undefined) => n != null ? `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—";

  const columns: Column<Funding>[] = [
    { key: "title", label: t("funding.title"), width: "minmax(0,1.2fr)", sortable: true, render: (f) => <span className="truncate font-medium text-content">{f.title}</span> },
    { key: "source", label: t("funding.source"), width: "120px", sortable: true, render: (f) => <span className="truncate text-content-muted">{f.source || "—"}</span> },
    { key: "total", label: t("funding.total"), width: "120px", sortable: true, align: "right", render: (f) => <span className="font-medium text-content">{fmt(f.total_amount)}</span> },
    { key: "spent", label: t("funding.spent"), width: "120px", align: "right", render: (f) => <span className="text-content-muted">{fmt(f.spent)}</span> },
    { key: "balance", label: t("funding.balance"), width: "130px", sortable: true, align: "right", render: (f) => {
      const b = f.balance ?? 0;
      return <span className={b <= 0 ? "font-medium text-urgent" : "font-medium text-ok"}>{fmt(b)}</span>;
    }},
    { key: "status", label: t("col.status"), width: "88px", render: (f) => <Badge tone={STATUS_TONE[f.status]}>{t(`funding.status.${f.status}`)}</Badge> },
  ];

  const selected = items.find((f) => f.id === id) ?? null;
  const openItem = (fid: string) => navigate(`/funding/${fid}`);
  const remove = async (f: Funding) => {
    if (await confirmDialog(t("funding.confirmDelete", { title: f.title }))) {
      await deleteFunding(f.id);
      useRefresh.getState().bump();
      if (id === f.id) navigate("/funding");
    }
  };

  return (
    <>
      <Toolbar title={t("funding.title")} subtitle={t("funding.count", { n: items.length })}
        actions={<Button variant="primary" onClick={() => setForm({ open: true })}><Plus size={14} /> {t("funding.new")}</Button>} />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-panel px-2 py-1.5">
          <div className="relative w-56">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
            <TextInput className="pl-7" placeholder={t("funding.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="ml-auto w-64"><ListControls hideSort groupOptions={GROUP_OPTIONS} view={view} onChange={setView} /></div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto">
            <DataTable storageKey="funding" columns={columns} sections={sections} sortKey={view.sort} onSort={(k) => setView({ ...view, sort: k })}
              getId={(f) => f.id} selectedId={id} onSelect={openItem} collapsed={EMPTY} onToggle={() => {}}
              empty={<p className="px-3 py-8 text-center text-2xs text-content-subtle">{t("funding.none")}</p>} />
          </div>
          <DockPanel selected={!!selected} onOpenInTab={selected ? () => openItem(selected.id) : undefined}>
            {selected && <FundingDetail funding={selected} t={t} onEdit={() => setForm({ open: true, edit: selected })} onDelete={() => remove(selected)} />}
          </DockPanel>
        </div>
      </div>
      <FundingForm open={form.open} existing={form.edit} onClose={() => setForm({ open: false })} onSaved={() => useRefresh.getState().bump()} />
    </>
  );
}

function FundingDetail({ funding: f, t, onEdit, onDelete }: { funding: Funding; t: TFn; onEdit: () => void; onDelete: () => void }) {
  const fmt = (n: number | null | undefined) => n != null ? `¥${n.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—";
  const b = f.balance ?? 0;
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-content">{f.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[f.status]}>{t(`funding.status.${f.status}`)}</Badge>
            <Badge tone="neutral">{t(`funding.cat.${f.category}`)}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" onClick={onEdit}><Pencil size={14} /></Button>
          <Button variant="danger" onClick={onDelete}><Trash2 size={14} /></Button>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-surface-sunken p-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <Info lab={t("funding.total")} val={fmt(f.total_amount)} />
          <Info lab={t("funding.spent")} val={fmt(f.spent)} />
          <Info lab={t("funding.balance")} val={<span className={b <= 0 ? "text-urgent" : "text-ok"}>{fmt(b)}</span>} />
          <Info lab={t("funding.source")} val={f.source || "—"} />
          {f.number && <Info lab={t("funding.number")} val={f.number} />}
          {f.start_date && <Info lab={t("funding.start")} val={f.start_date} />}
          {f.end_date && <Info lab={t("funding.end")} val={f.end_date} />}
        </div>
      </div>
      {f.notes && <p className="mt-3 whitespace-pre-wrap text-xs text-content-muted">{f.notes}</p>}
    </div>
  );
}
const Info = ({ lab, val }: { lab: string; val: React.ReactNode }) => (
  <div><span className="text-content-subtle">{lab}</span><div className="mt-0.5 font-medium text-content">{val}</div></div>
);
