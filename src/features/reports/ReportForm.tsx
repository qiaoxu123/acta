import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, TextInput } from "@/components/ui/controls";
import {
  aggregateWeek,
  createReport,
  updateReport,
} from "@/db/repositories/reports";
import type { Report } from "@/db/types";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { composeBody, currentWeek } from "./draft";

function isoBounds(startDate: string, endDate: string) {
  const startISO = new Date(`${startDate}T00:00:00`).toISOString();
  const end = new Date(`${endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return { startISO, endISO: end.toISOString() };
}

export function ReportForm({
  open,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing?: Report | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setTitle(existing.title);
      setStart(existing.period_start ?? "");
      setEnd(existing.period_end ?? "");
    } else {
      const wk = currentWeek();
      setTitle(wk.title);
      setStart(wk.startDate);
      setEnd(wk.endDate);
    }
  }, [open, existing]);

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      let id: string;
      if (existing) {
        await updateReport(existing.id, {
          title: title.trim(),
          period_start: start || null,
          period_end: end || null,
        });
        id = existing.id;
      } else {
        // New report: seed the sectioned body with this period's aggregated progress.
        const agg = start && end ? await aggregateWeek({ startDate: start, endDate: end, ...isoBounds(start, end) }) : { done: [], doing: [] };
        id = await createReport({
          title: title.trim(),
          period_start: start || null,
          period_end: end || null,
          body: composeBody(t, agg),
        });
      }
      useRefresh.getState().bump();
      onSaved?.(id);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      title={existing ? t("report.edit") : t("report.new")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="primary" onClick={save}>
            {existing ? t("common.save") : t("report.createAggregate")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label={t("report.title")}>
          <TextInput autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("report.start")}>
            <TextInput type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label={t("report.end")}>
            <TextInput type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        {!existing && <p className="text-2xs text-content-subtle">{t("report.newHint")}</p>}
      </div>
    </Modal>
  );
}
