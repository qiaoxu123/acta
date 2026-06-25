import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, FolderOpen, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge } from "@/components/ui/misc";
import { InlinePicker, InlineText, type PickOption } from "@/components/ui/InlineEdit";
import { ListControls, type Option } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { CATEGORY_ORDER, deleteStudent, listStudents, updateStudent } from "@/db/repositories/students";
import type { Student } from "@/db/repositories/students";
import {
  addStudentFile, deleteStudentFile, listStudentFiles, updateStudentFileKind,
  type FileKind, type StudentFile,
} from "@/db/repositories/studentFiles";
import {
  humanSize, openStudentFile, pickStudentFiles, removeStudentFile, revealStudentFile, storeFilePaths,
} from "@/lib/attachments";
import { useFileDrop } from "@/lib/useFileDrop";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpStr, useListView } from "@/lib/listview";
import { useRefresh } from "@/store/refresh";
import { StudentForm } from "./StudentForm";

const CATEGORIES = ["incoming", "master", "phd", "assistant", "rec_applicant", "phd_applicant", "graduated"];
const STATUSES = ["pending", "agreed", "active", "declined", "graduated", "transferred"];
const FILE_KINDS = ["resume", "transcript", "attachment", "other"];
const STATUS_ORDER = STATUSES;
const STATUS_TONE: Record<string, "neutral" | "accent" | "ok" | "warn" | "urgent"> = {
  pending: "warn",
  agreed: "ok",
  active: "neutral", // calm — in-lab baseline, not an alarm
  declined: "neutral",
  graduated: "neutral",
  transferred: "urgent",
  applying: "warn", // legacy fallback
};

const GROUP_OPTIONS: Option[] = [
  { value: "category", labelKey: "lv.group.studentCategory" },
  { value: "status", labelKey: "lv.group.status" },
];

const catIndex = (c: string) => {
  const i = CATEGORY_ORDER.indexOf(c as never);
  return i < 0 ? CATEGORY_ORDER.length : i;
};

const compare = (key: string, a: Student, b: Student) => {
  switch (key) {
    case "name": return cmpStr(a.name, b.name);
    case "status":
      return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || cmpStr(a.name, b.name);
    default: // category
      return catIndex(a.category) - catIndex(b.category) || cmpStr(a.name, b.name);
  }
};

type Agg = { key: string; n: number; labelKey: string; cat: string; status?: string };
function aggregates(items: Student[]): Agg[] {
  const n = (cat: string, status?: string) =>
    items.filter((s) => s.category === cat && (!status || s.status === status)).length;
  return [
    { key: "incoming", cat: "incoming", n: n("incoming"), labelKey: "stu.agg.incoming" },
    { key: "master", cat: "master", n: n("master"), labelKey: "stu.agg.master" },
    { key: "phd", cat: "phd", n: n("phd"), labelKey: "stu.agg.phd" },
    { key: "assistant", cat: "assistant", n: n("assistant"), labelKey: "stu.agg.assistant" },
    { key: "recAgreed", cat: "rec_applicant", status: "agreed", n: n("rec_applicant", "agreed"), labelKey: "stu.agg.recAgreed" },
    { key: "recPending", cat: "rec_applicant", status: "pending", n: n("rec_applicant", "pending"), labelKey: "stu.agg.recPending" },
    { key: "phdApplicant", cat: "phd_applicant", n: n("phd_applicant"), labelKey: "stu.agg.phdApplicant" },
  ].filter((c) => c.n > 0);
}

// Option lists for the inline pickers (with a colored dot for status).
const statusOpts = (t: TFn): PickOption[] => STATUSES.map((s) => ({
  value: s, label: t(`stu.status.${s}`),
  node: <Badge tone={STATUS_TONE[s] ?? "neutral"}>·</Badge>,
}));
const categoryOpts = (t: TFn): PickOption[] => CATEGORIES.map((c) => ({ value: c, label: t(`stu.cat.${c}`) }));

export function StudentsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const bump = useRefresh.getState().bump;

  const [view, setView] = useListView("acta.lv.students", { sort: "name", group: "category", scope: "active" });
  const [items, setItems] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Agg | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ open: boolean; edit?: Student | null }>({ open: false });

  useEffect(() => { listStudents("active").then(setItems); }, [tick]);

  const patch = useCallback(async (sid: string, p: Partial<Student>) => {
    await updateStudent(sid, p as never); bump();
  }, [bump]);

  const groupOf = (key: string, s: Student) => {
    if (key === "status") return { key: s.status, label: t(`stu.status.${s.status}`), order: STATUS_ORDER.indexOf(s.status) };
    return { key: s.category, label: t(`stu.cat.${s.category}`), order: catIndex(s.category) };
  };

  const aggs = useMemo(() => aggregates(items), [items]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((s) => {
      if (filter && (s.category !== filter.cat || (filter.status && s.status !== filter.status))) return false;
      return !q || [s.name, s.school, s.email, s.direction, s.grade].filter(Boolean).some((v) => v!.toLowerCase().includes(q));
    });
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [items, query, filter, view.sort, view.group, t]);

  const sOpts = useMemo(() => statusOpts(t), [t]);

  const columns: Column<Student>[] = [
    { key: "name", label: t("stu.name"), width: "minmax(0,0.7fr)", sortable: true,
      render: (s) => <span className="truncate font-medium text-content">{s.name}</span> },
    { key: "grade", label: t("stu.grade"), width: "76px",
      render: (s) => s.grade ? <Badge tone="neutral">{s.grade}</Badge> : <span className="text-content-subtle">—</span> },
    { key: "school", label: t("stu.school"), width: "minmax(0,0.9fr)",
      render: (s) => <span className="truncate text-content-muted">{s.school || "—"}</span> },
    { key: "direction", label: t("stu.direction"), width: "minmax(0,1fr)",
      render: (s) => <span className="truncate text-content-subtle">{s.direction || "—"}</span> },
    { key: "status", label: t("col.status"), width: "92px",
      // Click the badge to change status inline — without selecting the row.
      render: (s) => (
        <InlinePicker value={s.status} options={sOpts} title={t("stu.status")}
          onChange={(v) => patch(s.id, { status: v })}>
          <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{t(`stu.status.${s.status}`)}</Badge>
        </InlinePicker>
      ) },
    { key: "date", label: t("stu.interview"), width: "104px", align: "right",
      render: (s) => <span className="text-2xs text-content-subtle">{s.interview_date || s.exam_date || "—"}</span> },
  ];

  const selected = items.find((s) => s.id === id) ?? null;
  const toggle = (k: string) => setCollapsed((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const openItem = (sid: string) => navigate(`/students/${sid}`);
  const remove = async (s: Student) => {
    if (await confirmDialog(t("stu.confirmDelete", { name: s.name }))) {
      await deleteStudent(s.id); bump();
      if (id === s.id) navigate("/students");
    }
  };

  return (
    <>
      <Toolbar title={t("students.title")} subtitle={t("students.count", { n: items.length })}
        actions={<Button variant="primary" onClick={() => setForm({ open: true })}><Plus size={14} /> {t("students.new")}</Button>} />
      <div className="flex min-h-0 flex-1 flex-col">
        {aggs.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-panel px-3 py-1.5">
            {aggs.map((c) => {
              const on = filter?.key === c.key;
              return (
                <button key={c.key} onClick={() => setFilter(on ? null : c)}
                  className={`rounded-full border px-2.5 py-0.5 text-2xs transition ${
                    on ? "border-accent bg-accent/10 text-accent"
                       : "border-border bg-surface text-content-muted hover:border-accent/50"}`}>
                  {t(c.labelKey)} <span className={`font-semibold ${on ? "text-accent" : "text-content"}`}>{c.n}</span>
                </button>
              );
            })}
            {filter && (
              <button onClick={() => setFilter(null)} className="ml-1 text-2xs text-content-subtle hover:text-content underline">
                {t("common.clear")}
              </button>
            )}
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
            {selected && <StudentDetail student={selected} t={t} patch={patch}
              onEdit={() => setForm({ open: true, edit: selected })} onDelete={() => remove(selected)} />}
          </DockPanel>
        </div>
      </div>
      <StudentForm open={form.open} existing={form.edit} onClose={() => setForm({ open: false })} onSaved={() => bump()} />
    </>
  );
}

function StudentDetail({ student: s, t, patch, onEdit, onDelete }: {
  student: Student; t: TFn; patch: (id: string, p: Partial<Student>) => Promise<void>; onEdit: () => void; onDelete: () => void;
}) {
  const set = (p: Partial<Student>) => patch(s.id, p);
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-content">{s.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {/* Click role / status badges to change them inline */}
            <InlinePicker value={s.category} options={categoryOpts(t)} title={t("stu.category")}
              onChange={(v) => set({ category: v })}>
              <Badge tone="accent">{t(`stu.cat.${s.category}`)}</Badge>
            </InlinePicker>
            <InlinePicker value={s.status} options={statusOpts(t)} title={t("stu.status")}
              onChange={(v) => set({ status: v })}>
              <Badge tone={STATUS_TONE[s.status] ?? "neutral"}>{t(`stu.status.${s.status}`)}</Badge>
            </InlinePicker>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" onClick={onEdit} title={t("students.edit")}><Pencil size={14} /></Button>
          <Button variant="danger" onClick={onDelete}><Trash2 size={14} /></Button>
        </div>
      </div>

      {/* Inline-editable field grid (click any value to edit) */}
      <div className="mt-4 rounded-md bg-surface-sunken p-3 text-xs">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          <EditRow lab={t("stu.grade")} v={s.grade ?? ""} onSave={(v) => set({ grade: v || null })} />
          <EditRow lab={t("stu.direction")} v={s.direction ?? ""} onSave={(v) => set({ direction: v || null })} />
          <EditRow lab={t("stu.school")} v={s.school ?? ""} onSave={(v) => set({ school: v || null })} span />
          <EditRow lab={t("stu.email")} v={s.email ?? ""} onSave={(v) => set({ email: v || null })} />
          <EditRow lab={t("stu.phone")} v={s.phone ?? ""} onSave={(v) => set({ phone: v || null })} />
          <EditRow lab={t("stu.coAdvisor")} v={s.co_advisor ?? ""} onSave={(v) => set({ co_advisor: v || null })} />
          <EditRow lab={t("stu.enrollment")} v={s.enrollment_year ?? ""} onSave={(v) => set({ enrollment_year: v || null })} />
          <EditRow lab={t("stu.exam")} v={s.exam_date ?? ""} type="date" onSave={(v) => set({ exam_date: v || null })} />
          <EditRow lab={t("stu.interview")} v={s.interview_date ?? ""} type="date" onSave={(v) => set({ interview_date: v || null })} />
        </div>
      </div>

      {s.notes && <p className="mt-3 whitespace-pre-wrap text-xs text-content-muted">{s.notes}</p>}

      <AttachmentsSection studentId={s.id} t={t} />
    </div>
  );
}

function EditRow({ lab, v, onSave, type, span }: {
  lab: string; v: string; onSave: (v: string) => void; type?: string; span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : ""}>
      <span className="text-content-subtle">{lab}</span>
      <div className="mt-0.5 -ml-1.5"><InlineText value={v} type={type} onChange={onSave} /></div>
    </div>
  );
}

function AttachmentsSection({ studentId, t }: { studentId: string; t: TFn }) {
  const [files, setFiles] = useState<StudentFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(() => { listStudentFiles(studentId).then(setFiles); }, [studentId]);
  useEffect(() => { reload(); }, [reload]);

  const kindOpts: PickOption[] = FILE_KINDS.map((k) => ({ value: k, label: t(`stu.kind.${k}`) }));

  const ingest = useCallback(async (picked: { name: string; rel_path: string; size: number }[]) => {
    for (const p of picked) {
      await addStudentFile({ student_id: studentId, name: p.name, kind: "attachment", rel_path: p.rel_path, size: p.size });
    }
    reload();
  }, [studentId, reload]);

  const store = useCallback(async (paths: string[]) => {
    setBusy(true); setError(null);
    try {
      await ingest(await storeFilePaths(studentId, paths));
    } catch (e) {
      console.error("attach failed", e);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [studentId, ingest]);

  const dragOver = useFileDrop(store);

  const add = async () => {
    setBusy(true); setError(null);
    try {
      await ingest(await pickStudentFiles(studentId));
    } catch (e) {
      console.error("attach failed", e);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const del = async (f: StudentFile) => {
    if (!(await confirmDialog(t("stu.files.confirmDelete", { name: f.name })))) return;
    await removeStudentFile(f.rel_path);
    await deleteStudentFile(f.id);
    reload();
  };

  const setKind = async (f: StudentFile, kind: string) => {
    await updateStudentFileKind(f.id, kind as FileKind);
    reload();
  };

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">{t("stu.files")}</span>
        <Button variant="ghost" onClick={add} disabled={busy}><Upload size={13} /> {t("stu.files.add")}</Button>
      </div>
      <div className={`rounded-md transition-colors ${dragOver ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : ""}`}>
      {dragOver ? (
        <p className="rounded-md border-2 border-dashed border-accent bg-accent-soft px-3 py-6 text-center text-xs font-medium text-accent">{t("stu.files.drop")}</p>
      ) : busy ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-2xs text-content-subtle">{t("stu.files.uploading")}</p>
      ) : files.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-2xs text-content-subtle">{t("stu.files.none")}</p>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
              <InlinePicker value={f.kind} options={kindOpts} title={t("stu.files")}
                onChange={(v) => setKind(f, v)}>
                <Badge tone="neutral">{t(`stu.kind.${f.kind}`)}</Badge>
              </InlinePicker>
              <button onClick={() => openStudentFile(f.rel_path)} title={t("stu.files.open")}
                className="min-w-0 flex-1 truncate text-left text-xs text-content hover:text-accent">{f.name}</button>
              {f.size != null && <span className="shrink-0 text-2xs text-content-subtle">{humanSize(f.size)}</span>}
              <button onClick={() => openStudentFile(f.rel_path)} title={t("stu.files.open")}
                className="shrink-0 text-content-subtle hover:text-accent"><ExternalLink size={13} /></button>
              <button onClick={() => revealStudentFile(f.rel_path)} title={t("stu.files.reveal")}
                className="shrink-0 text-content-subtle hover:text-accent"><FolderOpen size={13} /></button>
              <button onClick={() => del(f)} title={t("stu.files.delete")}
                className="shrink-0 text-content-subtle hover:text-urgent"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}
      </div>
      {error && <p className="mt-1.5 text-2xs text-urgent">{t("stu.files.failed")}: {error}</p>}
    </div>
  );
}
