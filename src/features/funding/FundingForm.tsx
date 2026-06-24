import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import { createFunding, updateFunding } from "@/db/repositories/funding";
import type { Funding } from "@/db/repositories/funding";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

const CATS = ["grant", "contract", "other"] as const;
const STATUSES = ["active", "completed", "closed"] as const;

export function FundingForm({ open, existing, onClose, onSaved }: {
  open: boolean; existing?: Funding | null; onClose: () => void; onSaved?: () => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("");
  const [num, setNum] = useState("");
  const [total, setTotal] = useState("");
  const [spent, setSpent] = useState("");
  const [category, setCategory] = useState<string>("grant");
  const [status, setStatus] = useState<string>("active");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(existing?.title ?? "");
    setSource(existing?.source ?? "");
    setNum(existing?.number ?? "");
    setTotal(existing?.total_amount != null ? String(existing.total_amount) : "");
    setSpent(existing?.spent != null ? String(existing.spent) : "");
    setCategory(existing?.category ?? "grant");
    setStatus(existing?.status ?? "active");
    setStart(existing?.start_date ?? "");
    setEnd(existing?.end_date ?? "");
    setNotes(existing?.notes ?? "");
  }, [open, existing]);

  const save = async () => {
    if (!title.trim()) return;
    const data = {
      title: title.trim(), source: source.trim() || null, number: num.trim() || null,
      total_amount: total ? Number(total) : null, spent: spent ? Number(spent) : 0,
      category, status, start_date: start || null, end_date: end || null,
      notes: notes.trim() || null,
    };
    if (existing) { await updateFunding(existing.id, data); } else { await createFunding(data); }
    useRefresh.getState().bump();
    onSaved?.();
    onClose();
  };

  return (
    <Modal open={open} title={existing ? t("funding.edit") : t("funding.new")} onClose={onClose}
      footer={<><Button onClick={onClose}>{t("common.cancel")}</Button><Button variant="primary" onClick={save}>{t("common.save")}</Button></>}>
      <div className="space-y-3">
        <Field label={t("funding.title")}><TextInput autoFocus value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("funding.source")}><TextInput value={source} onChange={(e) => setSource(e.target.value)} /></Field>
          <Field label={t("funding.number")}><TextInput value={num} onChange={(e) => setNum(e.target.value)} /></Field>
          <Field label={t("funding.total")}><TextInput type="number" value={total} onChange={(e) => setTotal(e.target.value)} /></Field>
          <Field label={t("funding.spent")}><TextInput type="number" value={spent} onChange={(e) => setSpent(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("col.fundingCat")}>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATS.map((c) => <option key={c} value={c}>{t(`funding.cat.${c}`)}</option>)}</Select></Field>
          <Field label={t("col.status")}>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{t(`funding.status.${s}`)}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("funding.start")}><TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label={t("funding.end")}><TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label={t("funding.notes")}><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
