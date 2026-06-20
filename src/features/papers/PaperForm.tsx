import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import {
  createPaper,
  updatePaper,
  type PaperInput,
} from "@/db/repositories/papers";
import type { Paper, PaperStatus } from "@/db/types";
import { useRefresh } from "@/store/refresh";
import { PAPER_STATUSES, STATUS_LABEL } from "./paperStatus";

function empty(): PaperInput {
  return {
    title: "",
    target_venue_id: null,
    target_venue: "",
    status: "idea",
    authors: "",
    abstract: "",
    overleaf_url: "",
    repo_url: "",
    started_date: "",
    notes: "",
  };
}

export function PaperForm({
  open,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing?: Paper | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const [form, setForm] = useState<PaperInput>(empty());
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = existing?.id ?? "new";
  if (open && seedKey !== key) {
    setSeedKey(key);
    setForm(
      existing
        ? {
            title: existing.title,
            target_venue_id: existing.target_venue_id,
            target_venue: existing.target_venue ?? "",
            status: existing.status,
            authors: existing.authors ?? "",
            abstract: existing.abstract ?? "",
            overleaf_url: existing.overleaf_url ?? "",
            repo_url: existing.repo_url ?? "",
            started_date: existing.started_date ?? "",
            notes: existing.notes ?? "",
          }
        : empty(),
    );
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof PaperInput>(k: K, v: PaperInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return;
    let id: string;
    if (existing) {
      await updatePaper(existing.id, form);
      id = existing.id;
    } else id = await createPaper(form);
    bump();
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      wide
      title={existing ? "Edit paper" : "New paper"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="Title">
          <TextInput
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => set("status", e.target.value as PaperStatus)}
            >
              {PAPER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Target venue">
            <TextInput
              value={form.target_venue ?? ""}
              placeholder="TWC / NeurIPS"
              onChange={(e) => set("target_venue", e.target.value)}
            />
          </Field>
          <Field label="Started">
            <TextInput
              type="date"
              value={form.started_date ?? ""}
              onChange={(e) => set("started_date", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Authors" hint="Comma-separated">
          <TextInput
            value={form.authors ?? ""}
            placeholder="X. Qiao, …"
            onChange={(e) => set("authors", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Overleaf / draft URL">
            <TextInput
              value={form.overleaf_url ?? ""}
              onChange={(e) => set("overleaf_url", e.target.value)}
            />
          </Field>
          <Field label="Code repo URL">
            <TextInput
              value={form.repo_url ?? ""}
              onChange={(e) => set("repo_url", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Abstract">
          <Textarea
            rows={3}
            value={form.abstract ?? ""}
            onChange={(e) => set("abstract", e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <Textarea
            rows={2}
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
