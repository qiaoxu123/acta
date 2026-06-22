import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import {
  createManuscript,
  updateManuscript,
  type ManuscriptInput,
} from "@/db/repositories/reviews";
import type {
  ManuscriptStatus,
  ReviewedManuscript,
  ReviewerRole,
  ReviewType,
} from "@/db/types";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const ROLES: ReviewerRole[] = ["reviewer", "meta", "pc"];
const TYPES: ReviewType[] = ["journal", "conference", "grant", "thesis", "book", "other"];
const STATUSES: ManuscriptStatus[] = [
  "invited",
  "accepted",
  "in_progress",
  "submitted",
  "declined",
  "done",
];

function empty(): ManuscriptInput {
  return {
    venue_id: null,
    venue_name: "",
    title: "",
    manuscript_id: "",
    role: "reviewer",
    review_type: "journal",
    status: "invited",
    review_url: "",
    agree_url: "",
    decline_url: "",
    unavailable_url: "",
    notes: "",
  };
}

export function ManuscriptForm({
  open,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing?: ReviewedManuscript | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const [form, setForm] = useState<ManuscriptInput>(empty());
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = existing?.id ?? "new";
  if (open && seedKey !== key) {
    setSeedKey(key);
    setForm(
      existing
        ? {
            venue_id: existing.venue_id,
            venue_name: existing.venue_name ?? "",
            title: existing.title,
            manuscript_id: existing.manuscript_id ?? "",
            role: existing.role,
            review_type: existing.review_type,
            status: existing.status,
            review_url: existing.review_url ?? "",
            agree_url: existing.agree_url ?? "",
            decline_url: existing.decline_url ?? "",
            unavailable_url: existing.unavailable_url ?? "",
            notes: existing.notes ?? "",
          }
        : empty(),
    );
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof ManuscriptInput>(k: K, v: ManuscriptInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return;
    let id: string;
    if (existing) {
      await updateManuscript(existing.id, form);
      id = existing.id;
    } else id = await createManuscript(form);
    bump();
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={existing ? t("mform.edit") : t("mform.new")}
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
        <Field label={t("mform.title")}>
          <TextInput
            autoFocus
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("mform.venue")}>
            <TextInput
              value={form.venue_name ?? ""}
              placeholder="TWC / NeurIPS 2026"
              onChange={(e) => set("venue_name", e.target.value)}
            />
          </Field>
          <Field label={t("mform.msid")}>
            <TextInput
              value={form.manuscript_id ?? ""}
              placeholder="TWC-2026-1234"
              onChange={(e) => set("manuscript_id", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("mform.reviewType")}>
            <Select
              value={form.review_type}
              onChange={(e) => set("review_type", e.target.value as ReviewType)}
            >
              {TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {t(`rtype.${rt}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("mform.role")}>
            <Select value={form.role} onChange={(e) => set("role", e.target.value as ReviewerRole)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`role.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("mform.status")}>
            <Select
              value={form.status}
              onChange={(e) => set("status", e.target.value as ManuscriptStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`mstatus.${s}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label={t("mform.reviewUrl")}>
          <TextInput
            value={form.review_url ?? ""}
            placeholder="https://mc.manuscriptcentral.com/…"
            onChange={(e) => set("review_url", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("mform.agreeUrl")}>
            <TextInput value={form.agree_url ?? ""} onChange={(e) => set("agree_url", e.target.value)} />
          </Field>
          <Field label={t("mform.declineUrl")}>
            <TextInput value={form.decline_url ?? ""} onChange={(e) => set("decline_url", e.target.value)} />
          </Field>
          <Field label={t("mform.unavailableUrl")}>
            <TextInput
              value={form.unavailable_url ?? ""}
              onChange={(e) => set("unavailable_url", e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("common.notes")}>
          <Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
