import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge } from "@/components/ui/misc";
import { ListControls, type Option } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { deleteStudent, listStudents } from "@/db/repositories/students";
import type { Student } from "@/db/repositories/students";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpStr, useListView } from "@/lib/listview";
import { useRefresh } from "@/store/refresh";
import { StudentForm } from "./StudentForm";

const LEVEL_ORDER = ["phd", "master", "bachelor"];
const STATUS_ORDER = ["applying", "active", "graduated", "transferred"];
const STATUS_TONE: Record<string, "neutral" | "accent" | "ok" | "warn" | "urgent"> = {
  applying: "warn",
  active: "ok",
  graduated: "neutral",
  transferred: "urgent",
};

const GROUP_OPTIONS: Option[] = [
  { value: "level", labelKey: "lv.group.studentLevel" },
  { value: "status", labelKey: "lv.group.status" },
];

const compare = (key: string, a: Student, b: Student) => {
  switch (key) {
    case "name": return cmpStr(a.name, b.name);
    case "level":
      return LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level) || cmpStr(a.name, b.name);
    default:
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || cmpStr(a.name, b.name);
  }
};

// Quick aggregate counts across student categories
function countsByLevel(items: Student[]) {
  const applying = (g: string[]) => items.filter((s) => g.includes(s.level) && s.status === "applying").length;
  return [
    { key: "bachelor", n: applying(["bachelor"]), labelKey: "stu.applyingBachelor" },
    { key: "master", n: items.filter((s) => s.level === "master" && s.status === "active").length, labelKey: "stu.activeMaster" },
    { key: "phd", n: items.filter((s) => s.level === "phd" && s.status === "active").length, labelKey: "stu.activePhd" },
  ].filter((c) => c.n > 0);
}

export function StudentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [view, setView] = useListView("acta.lv.students", { sort: "name", group: "level", scope: "active" });
  const [items, setItems] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; edit?: Student | null }>({ open: false });

  useEffect(() => { listStudents("active").then(setItems); }, [tick]);

  useEffect(() => {
    // Collapse applying (applicants) by default; keep enrolled students expanded
    setCollapsed(view.group === "status" ? new Set(["applying", "graduated", "transferred"]) : new Set());
  }, [view.group]);

  const groupOf = (key: string, s: Student) => {
    if (key === "status") return { key: s.status, label: t(`stu.status.${s.status}`), order: STATUS_ORDER.indexOf(s.status) };
    return { key: s.level, label: t(`stu.level.${s.level}`), order: LEVEL_ORDER.indexOf(s.level) };
  };

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((s) =>
      !q || [s.name, s.email, s.direction, s.co_advisor].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [items, query, view.sort, view.group, t]);

  const aggregates = useMemo(() => countsByLevel(items), [items]);

  const columns: Column<Student>[] = [
    { key: "name", label: t("stu.name"), width: "minmax(0,0.8fr)", sortable: true,
      render: (s) => <span className="truncate font-medium text-content">{s.name}</span> },
    { key: "level", label: t("stu.level"), width: "80px",
      render: (s) => <Badge tone="neutral">{t(`stu.level.${s.level}`)}</Badge> },
    { key: "direction", label: t("stu.direction"), width: "minmax(0,1fr)",
      render: (s) => <span className="truncate text-content-muted">{s.direction || "—"}</span> },
    { key: "status", label: t("col.status"), width: "88px",
      render: (s) => <Badge tone={STATUS_TONE[s.status]}>{t(`stu.status.${s.status}`)}</Badge> },
    { key: "exam", label: t("stu.exam"), width: "112px", align: "right",
      render: (s) => <span className="text-2xs text-content-subtle">{s.exam_date || "—"}</span> },
    { key: "interview", label: t("stu.interview"), width: "112px", align: "right",
      render: (s) => <span className="text-2xs text-content-subtle">{s.interview_date || "—"}</span> },
  ];

  const selected = items.find((s) => s.id === id) ?? null;
  const toggle = (k: string) => setCollapsed((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const openItem = (sid: string) => navigate(`/students/${sid}`);
  const remove = async (s: Student) => {
    if (await confirmDialog(t("stu.confirmDelete", { name: s.name }))) {
      await deleteStudent(s.id); useRefresh.getState().bump();
      if (id === s.id) navigate("/students");
    }
  };

  return (
    <>
      <Toolbar title={t("students.title")} subtitle={t("students.count", { n: items.length })}
        actions={<Button variant="primary" onClick={() => setForm({ open: true })}><Plus size={14} /> {t("students.new")}</Button>} />
      <div className="flex min-h-0 flex-1 flex-col">
        {aggregates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-panel px-3 py-1.5">
            {aggregates.map((c) => (
              <span key={c.key} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-2xs text-content-muted">
                {t(c.labelKey)}: <span className="font-semibold text-content">{c.n}</span>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-border bg-panel px-2 py-1.5">
          <div className="relative w-56">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
            <TextInput className="pl-7" placeholder={t("students.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="ml-auto w-64"><ListControls hideSort groupOptions={GROUP_OPTIONS} view={view} onChange={setView} /></div>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto">
            <DataTable storageKey="students" columns={columns} sections={sections} sortKey={view.sort} onSort={(k) => setView({ sort: k })}
              getId={(s) => s.id} selectedId={id} onSelect={openItem} collapsed={collapsed} onToggle={toggle}
              empty={<p className="px-3 py-8 text-center text-2xs text-content-subtle">{t("students.none")}</p>} />
          </div>
          <DockPanel selected={!!selected} onOpenInTab={selected ? () => openItem(selected.id) : undefined}>
            {selected && <StudentDetail student={selected} t={t} onEdit={() => setForm({ open: true, edit: selected })} onDelete={() => remove(selected)} />}
          </DockPanel>
        </div>
      </div>
      <StudentForm open={form.open} existing={form.edit} onClose={() => setForm({ open: false })} onSaved={() => useRefresh.getState().bump()} />
    </>
  );
}

function StudentDetail({ student: s, t, onEdit, onDelete }: { student: Student; t: TFn; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-content">{s.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[s.status]}>{t(`stu.status.${s.status}`)}</Badge>
            <Badge tone="neutral">{t(`stu.level.${s.level}`)}</Badge>
          </div>
          {s.direction && <p className="mt-1 text-2xs text-content-muted">{t("stu.direction")}: {s.direction}</p>}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" onClick={onEdit}><Pencil size={14} /></Button>
          <Button variant="danger" onClick={onDelete}><Trash2 size={14} /></Button>
        </div>
      </div>
      <div className="mt-4 rounded-md bg-surface-sunken p-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <Info lab={t("stu.email")} val={s.email || "—"} />
          <Info lab={t("stu.phone")} val={s.phone || "—"} />
          <Info lab={t("stu.level")} val={t(`stu.level.${s.level}`)} />
          <Info lab={t("stu.status")} val={t(`stu.status.${s.status}`)} />
          {s.enrollment_year && <Info lab={t("stu.enrollment")} val={s.enrollment_year} />}
          {s.graduation_year && <Info lab={t("stu.graduation")} val={s.graduation_year} />}
          {s.exam_date && <Info lab={t("stu.exam")} val={s.exam_date} />}
          {s.interview_date && <Info lab={t("stu.interview")} val={s.interview_date} />}
          {s.co_advisor && <Info lab={t("stu.coAdvisor")} val={s.co_advisor} />}
        </div>
      </div>
      {s.notes && <p className="mt-3 whitespace-pre-wrap text-xs text-content-muted">{s.notes}</p>}
    </div>
  );
}
const Info = ({ lab, val }: { lab: string; val: React.ReactNode }) => (
  <div><span className="text-content-subtle">{lab}</span><div className="mt-0.5 font-medium text-content">{val}</div></div>
);
