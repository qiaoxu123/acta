import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import { createIdea, updateIdea, type IdeaInput } from "@/db/repositories/ideas";
import type { Idea, IdeaCategory, IdeaStatus } from "@/db/types";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const CATEGORIES: IdeaCategory[] = [
  "idea",
  "experiment",
  "course",
  "hardware",
  "simulation",
  "paper",
  "infra",
];
const STATUSES: IdeaStatus[] = [
  "spark",
  "exploring",
  "validated",
  "building",
  "done",
  "paused",
  "dropped",
  "merged",
];

function empty(): IdeaInput {
  return {
    title: "",
    summary: "",
    category: "idea",
    status: "spark",
    priority: 0,
    repo_url: "",
    tags: "",
    notes: "",
  };
}

export function IdeaForm({
  open,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing?: Idea | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const [form, setForm] = useState<IdeaInput>(empty());
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = existing?.id ?? "new";
  if (open && seedKey !== key) {
    setSeedKey(key);
    setForm(
      existing
        ? {
            title: existing.title,
            summary: existing.summary ?? "",
            category: existing.category,
            status: existing.status,
            priority: existing.priority,
            repo_url: existing.repo_url ?? "",
            tags: existing.tags ?? "",
            notes: existing.notes ?? "",
          }
        : empty(),
    );
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof IdeaInput>(k: K, v: IdeaInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return;
    let id: string;
    if (existing) {
      await updateIdea(existing.id, form);
      id = existing.id;
    } else id = await createIdea(form);
    bump();
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={existing ? t("idea.edit") : t("idea.new")}
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
        <Field label={t("ideaf.title")}>
          <TextInput autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label={t("ideaf.summary")}>
          <TextInput value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("ideaf.category")}>
            <Select
              value={form.category}
              onChange={(e) => set("category", e.target.value as IdeaCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`icat.${c}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("ideaf.status")}>
            <Select value={form.status} onChange={(e) => set("status", e.target.value as IdeaStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`istatus.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("ideaf.repo")}>
          <TextInput
            value={form.repo_url ?? ""}
            placeholder="https://github.com/…"
            onChange={(e) => set("repo_url", e.target.value)}
          />
        </Field>
        <Field label={t("ideaf.tags")}>
          <TextInput
            value={form.tags ?? ""}
            placeholder={t("ideaf.tagsHint")}
            onChange={(e) => set("tags", e.target.value)}
          />
        </Field>
        <label className="flex items-center gap-2 text-xs text-content-muted">
          <input
            type="checkbox"
            checked={form.priority === 1}
            onChange={(e) => set("priority", e.target.checked ? 1 : 0)}
          />
          {t("ideaf.priority")}
        </label>
        <Field label={t("common.notes")}>
          <Textarea rows={4} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
