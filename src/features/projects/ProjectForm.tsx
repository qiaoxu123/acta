import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import {
  createProject,
  updateProject,
  type ProjectInput,
} from "@/db/repositories/projects";
import type { Project, ProjectCategory, ProjectStatus } from "@/db/types";
import { localInputToUtcIso, utcIsoToLocalInput } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const LEVELS = ["national", "provincial", "ministerial", "horizontal", "other"];
const STATUSES: ProjectStatus[] = ["planning", "applying", "active", "completed", "rejected"];

interface FormState {
  name: string;
  category: ProjectCategory;
  level: string;
  program: string;
  agency: string;
  number: string;
  pi_role: string;
  amount: string;
  status: ProjectStatus;
  apply_deadline: string; // datetime-local (local tz)
  start_date: string;
  end_date: string;
  notes: string;
}

export function ProjectForm({
  open,
  existing,
  defaultCategory,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing?: Project | null;
  defaultCategory: ProjectCategory;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const empty = (): FormState => ({
    name: "",
    category: defaultCategory,
    level: defaultCategory === "horizontal" ? "horizontal" : "national",
    program: "",
    agency: "",
    number: "",
    pi_role: "lead",
    amount: "",
    status: "planning",
    apply_deadline: "",
    start_date: "",
    end_date: "",
    notes: "",
  });
  const [form, setForm] = useState<FormState>(empty);
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = existing?.id ?? "new";
  if (open && seedKey !== key) {
    setSeedKey(key);
    setForm(
      existing
        ? {
            name: existing.name,
            category: existing.category,
            level: existing.level ?? "national",
            program: existing.program ?? "",
            agency: existing.agency ?? "",
            number: existing.number ?? "",
            pi_role: existing.pi_role ?? "lead",
            amount: existing.amount ?? "",
            status: existing.status,
            apply_deadline: utcIsoToLocalInput(existing.apply_deadline, "local"),
            start_date: existing.start_date ?? "",
            end_date: existing.end_date ?? "",
            notes: existing.notes ?? "",
          }
        : empty(),
    );
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return;
    const data: ProjectInput = {
      name: form.name,
      category: form.category,
      level: form.level || null,
      program: form.program || null,
      agency: form.agency || null,
      number: form.number || null,
      pi_role: form.pi_role || null,
      amount: form.amount || null,
      status: form.status,
      apply_deadline: localInputToUtcIso(form.apply_deadline, "local"),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      notes: form.notes || null,
    };
    let id: string;
    if (existing) {
      await updateProject(existing.id, data);
      id = existing.id;
    } else id = await createProject(data);
    bump();
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      wide
      title={existing ? t("projf.name") : t("proj.new")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" onClick={save}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("projf.name")}>
          <TextInput autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("projf.category")}>
            <Select value={form.category} onChange={(e) => set("category", e.target.value as ProjectCategory)}>
              <option value="vertical">{t("pcat.vertical")}</option>
              <option value="horizontal">{t("pcat.horizontal")}</option>
            </Select>
          </Field>
          <Field label={t("projf.level")}>
            <Select value={form.level} onChange={(e) => set("level", e.target.value)}>
              {LEVELS.map((x) => (
                <option key={x} value={x}>
                  {t(`plevel.${x}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("projf.status")}>
            <Select value={form.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
              {STATUSES.map((x) => (
                <option key={x} value={x}>
                  {t(`pstatus2.${x}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("projf.program")}>
            <TextInput value={form.program} placeholder="NSFC面上 / 省自然…" onChange={(e) => set("program", e.target.value)} />
          </Field>
          <Field label={t("projf.agency")}>
            <TextInput value={form.agency} onChange={(e) => set("agency", e.target.value)} />
          </Field>
          <Field label={t("projf.piRole")}>
            <Select value={form.pi_role} onChange={(e) => set("pi_role", e.target.value)}>
              <option value="lead">{t("prole3.lead")}</option>
              <option value="participant">{t("prole3.participant")}</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("projf.number")}>
            <TextInput value={form.number} onChange={(e) => set("number", e.target.value)} />
          </Field>
          <Field label={t("projf.amount")}>
            <TextInput value={form.amount} placeholder="80万 / ¥800k" onChange={(e) => set("amount", e.target.value)} />
          </Field>
          <Field label={t("projf.applyDeadline")}>
            <TextInput type="datetime-local" value={form.apply_deadline} onChange={(e) => set("apply_deadline", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("projf.startDate")}>
            <TextInput type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </Field>
          <Field label={t("projf.endDate")}>
            <TextInput type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
          </Field>
        </div>
        <Field label={t("common.notes")}>
          <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
