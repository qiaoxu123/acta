import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import {
  createPatent,
  updatePatent,
  type PatentInput,
} from "@/db/repositories/patents";
import type { Patent, PatentStatus, PatentType } from "@/db/types";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const TYPES: PatentType[] = ["invention", "utility", "design"];
const STATUSES: PatentStatus[] = ["drafting", "filed", "substantive", "granted", "rejected"];

function empty(): PatentInput {
  return {
    title: "",
    type: "invention",
    app_number: "",
    app_date: "",
    pub_number: "",
    grant_number: "",
    status: "drafting",
    inventors: "",
    my_role: "first",
    notes: "",
  };
}

export function PatentForm({
  open,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing?: Patent | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const [form, setForm] = useState<PatentInput>(empty());
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = existing?.id ?? "new";
  if (open && seedKey !== key) {
    setSeedKey(key);
    setForm(
      existing
        ? {
            title: existing.title,
            type: existing.type,
            app_number: existing.app_number ?? "",
            app_date: existing.app_date ?? "",
            pub_number: existing.pub_number ?? "",
            grant_number: existing.grant_number ?? "",
            status: existing.status,
            inventors: existing.inventors ?? "",
            my_role: existing.my_role ?? "first",
            notes: existing.notes ?? "",
          }
        : empty(),
    );
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof PatentInput>(k: K, v: PatentInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return;
    let id: string;
    if (existing) {
      await updatePatent(existing.id, form);
      id = existing.id;
    } else id = await createPatent(form);
    bump();
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      wide
      title={existing ? t("patf.title") : t("pat.new")}
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
        <Field label={t("patf.title")}>
          <TextInput autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("patf.type")}>
            <Select value={form.type} onChange={(e) => set("type", e.target.value as PatentType)}>
              {TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`ptype.${x}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("patf.status")}>
            <Select value={form.status} onChange={(e) => set("status", e.target.value as PatentStatus)}>
              {STATUSES.map((x) => (
                <option key={x} value={x}>
                  {t(`pstat.${x}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("patf.myRole")}>
            <Select value={form.my_role ?? "first"} onChange={(e) => set("my_role", e.target.value)}>
              <option value="first">{t("prole2.first")}</option>
              <option value="co">{t("prole2.co")}</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("patf.appNumber")}>
            <TextInput value={form.app_number ?? ""} onChange={(e) => set("app_number", e.target.value)} />
          </Field>
          <Field label={t("patf.appDate")}>
            <TextInput type="date" value={form.app_date ?? ""} onChange={(e) => set("app_date", e.target.value)} />
          </Field>
          <Field label={t("patf.pubNumber")}>
            <TextInput value={form.pub_number ?? ""} onChange={(e) => set("pub_number", e.target.value)} />
          </Field>
          <Field label={t("patf.grantNumber")}>
            <TextInput value={form.grant_number ?? ""} onChange={(e) => set("grant_number", e.target.value)} />
          </Field>
        </div>
        <Field label={t("patf.inventors")} hint={t("pform.authorsHint")}>
          <TextInput value={form.inventors ?? ""} onChange={(e) => set("inventors", e.target.value)} />
        </Field>
        <Field label={t("common.notes")}>
          <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
