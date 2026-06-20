import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import {
  createSubmission,
  updateSubmission,
  type SubmissionInput,
} from "@/db/repositories/papers";
import type { Decision, PaperSubmission } from "@/db/types";
import { localInputToUtcIso, utcIsoToLocalInput } from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const DECISIONS: Decision[] = [
  "pending",
  "minor",
  "major",
  "accept",
  "reject",
  "desk_reject",
];

interface FormState {
  round: string;
  venue_name: string;
  submitted_date: string;
  decision: string;
  decision_date: string;
  revision_deadline: string;
  reviewer_summary: string;
}

export function SubmissionForm({
  open,
  paperId,
  defaultVenue,
  nextRound,
  existing,
  onClose,
}: {
  open: boolean;
  paperId: string;
  defaultVenue: string;
  nextRound: number;
  existing?: PaperSubmission | null;
  onClose: () => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const empty = (): FormState => ({
    round: String(nextRound),
    venue_name: defaultVenue,
    submitted_date: "",
    decision: "pending",
    decision_date: "",
    revision_deadline: "",
    reviewer_summary: "",
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
            venue_name: existing.venue_name ?? "",
            submitted_date: existing.submitted_date ?? "",
            decision: existing.decision ?? "pending",
            decision_date: existing.decision_date ?? "",
            revision_deadline: utcIsoToLocalInput(existing.revision_deadline, "local"),
            reviewer_summary: existing.reviewer_summary ?? "",
          }
        : empty(),
    );
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const data: SubmissionInput = {
      paper_id: paperId,
      round: Number(form.round) || nextRound,
      venue_name: form.venue_name || null,
      submitted_date: form.submitted_date || null,
      decision: (form.decision || null) as Decision | null,
      decision_date: form.decision_date || null,
      revision_deadline: localInputToUtcIso(form.revision_deadline, "local"),
      reviewer_summary: form.reviewer_summary || null,
    };
    if (existing) await updateSubmission(existing.id, data);
    else await createSubmission(data);
    bump();
    onClose();
  };

  return (
    <Modal
      open={open}
      wide
      title={existing ? t("sform.edit", { n: existing.round }) : t("sform.new")}
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
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("sform.round")}>
            <TextInput
              type="number"
              value={form.round}
              onChange={(e) => set("round", e.target.value)}
            />
          </Field>
          <Field label={t("sform.venue")}>
            <TextInput
              value={form.venue_name}
              onChange={(e) => set("venue_name", e.target.value)}
            />
          </Field>
          <Field label={t("sform.decision")}>
            <Select value={form.decision} onChange={(e) => set("decision", e.target.value)}>
              {DECISIONS.map((d) => (
                <option key={d} value={d}>
                  {t(`dec.${d}`)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("sform.submitted")}>
            <TextInput
              type="date"
              value={form.submitted_date}
              onChange={(e) => set("submitted_date", e.target.value)}
            />
          </Field>
          <Field label={t("sform.decisionDate")}>
            <TextInput
              type="date"
              value={form.decision_date}
              onChange={(e) => set("decision_date", e.target.value)}
            />
          </Field>
          <Field label={t("sform.revisionDeadline")}>
            <TextInput
              type="datetime-local"
              value={form.revision_deadline}
              onChange={(e) => set("revision_deadline", e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("sform.summary")} hint={t("sform.summaryHint")}>
          <Textarea
            rows={6}
            value={form.reviewer_summary}
            onChange={(e) => set("reviewer_summary", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
