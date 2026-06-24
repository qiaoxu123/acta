import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import {
  createRound,
  updateRound,
  type RoundInput,
} from "@/db/repositories/reviews";
import type { Recommendation, ReviewRound } from "@/db/types";
import { localInputToUtcIso, utcIsoToLocalInput } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const RECS: Recommendation[] = ["accept", "minor", "major", "reject_resubmit", "reject"];

interface FormState {
  round: string;
  due_date: string;
  submitted_date: string;
  recommendation: string;
  confidence: string;
  comments: string;
  private_notes: string;
}

export function RoundForm({
  open,
  manuscriptId,
  nextRound,
  existing,
  onClose,
}: {
  open: boolean;
  manuscriptId: string;
  nextRound: number;
  existing?: ReviewRound | null;
  onClose: () => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const empty = (): FormState => ({
    round: String(nextRound),
    due_date: "",
    submitted_date: "",
    recommendation: "",
    confidence: "",
    comments: "",
    private_notes: "",
  });
  const [form, setForm] = useState<FormState>(empty);
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = existing?.id ?? `new-${nextRound}`;
  if (open && seedKey !== key) {
    setSeedKey(key);
    setForm(
      existing
        ? {
            round: String(existing.round),
            // Review due dates use local time.
            due_date: utcIsoToLocalInput(existing.due_date, "local"),
            submitted_date: utcIsoToLocalInput(existing.submitted_date, "local"),
            recommendation: existing.recommendation ?? "",
            confidence: existing.confidence != null ? String(existing.confidence) : "",
            comments: existing.comments ?? "",
            private_notes: existing.private_notes ?? "",
          }
        : empty(),
    );
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const data: RoundInput = {
      manuscript_id: manuscriptId,
      round: Number(form.round) || nextRound,
      invited_date: null,
      due_date: localInputToUtcIso(form.due_date, "local"),
      submitted_date: localInputToUtcIso(form.submitted_date, "local"),
      recommendation: (form.recommendation || null) as Recommendation | null,
      confidence: form.confidence ? Number(form.confidence) : null,
      comments: form.comments || null,
      private_notes: form.private_notes || null,
    };
    if (existing) await updateRound(existing.id, data);
    else await createRound(data);
    bump();
    onClose();
  };

  return (
    <Modal
      open={open}
      wide
      title={existing ? t("roundform.edit", { n: existing.round }) : t("roundform.new")}
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
        <div className="grid grid-cols-4 gap-3">
          <Field label={t("roundform.round")}>
            <TextInput
              type="number"
              value={form.round}
              onChange={(e) => set("round", e.target.value)}
            />
          </Field>
          <Field label={t("roundform.rec")}>
            <Select
              value={form.recommendation}
              onChange={(e) => set("recommendation", e.target.value)}
            >
              <option value="">—</option>
              {RECS.map((r) => (
                <option key={r} value={r}>
                  {t(`rec.${r}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("roundform.conf")}>
            <TextInput
              type="number"
              min={1}
              max={5}
              value={form.confidence}
              onChange={(e) => set("confidence", e.target.value)}
            />
          </Field>
          <div />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("roundform.due")}>
            <TextInput
              type="datetime-local"
              value={form.due_date}
              onChange={(e) => set("due_date", e.target.value)}
            />
          </Field>
          <Field label={t("roundform.submitted")}>
            <TextInput
              type="datetime-local"
              value={form.submitted_date}
              onChange={(e) => set("submitted_date", e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("roundform.comments")} hint={t("roundform.commentsHint")}>
          <Textarea
            rows={7}
            value={form.comments}
            placeholder={"Summary…\n\nStrengths…\n\nWeaknesses…\n\nDetailed comments…"}
            onChange={(e) => set("comments", e.target.value)}
          />
        </Field>
        <Field label={t("roundform.private")}>
          <Textarea
            rows={2}
            value={form.private_notes}
            onChange={(e) => set("private_notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
