import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import {
  createEdition,
  updateEdition,
  type EditionInput,
} from "@/db/repositories/venues";
import type { VenueEdition } from "@/db/types";
import {
  ZONE_OPTIONS,
  localInputToUtcIso,
  utcIsoToLocalInput,
} from "@/lib/dates";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

/** Form state mirrors the inputs: deadline fields hold datetime-local wall-clock
 *  strings (interpreted in `timezone`); event dates hold plain dates. */
interface FormState {
  year: string;
  cycle_label: string;
  location: string;
  timezone: string;
  abstract_deadline: string;
  submission_deadline: string;
  rebuttal_start: string;
  rebuttal_end: string;
  notification_date: string;
  camera_ready: string;
  event_start: string;
  event_end: string;
  url: string;
  notes: string;
}

const DEADLINE_KEYS = [
  "abstract_deadline",
  "submission_deadline",
  "rebuttal_start",
  "rebuttal_end",
  "notification_date",
  "camera_ready",
] as const;

function emptyState(): FormState {
  return {
    year: String(new Date().getFullYear()),
    cycle_label: "",
    location: "",
    timezone: "AoE",
    abstract_deadline: "",
    submission_deadline: "",
    rebuttal_start: "",
    rebuttal_end: "",
    notification_date: "",
    camera_ready: "",
    event_start: "",
    event_end: "",
    url: "",
    notes: "",
  };
}

function fromEdition(e: VenueEdition): FormState {
  const tz = e.timezone || "AoE";
  return {
    year: e.year != null ? String(e.year) : "",
    cycle_label: e.cycle_label ?? "",
    location: e.location ?? "",
    timezone: tz,
    abstract_deadline: utcIsoToLocalInput(e.abstract_deadline, tz),
    submission_deadline: utcIsoToLocalInput(e.submission_deadline, tz),
    rebuttal_start: utcIsoToLocalInput(e.rebuttal_start, tz),
    rebuttal_end: utcIsoToLocalInput(e.rebuttal_end, tz),
    notification_date: utcIsoToLocalInput(e.notification_date, tz),
    camera_ready: utcIsoToLocalInput(e.camera_ready, tz),
    event_start: e.event_start ?? "",
    event_end: e.event_end ?? "",
    url: e.url ?? "",
    notes: e.notes ?? "",
  };
}

export function EditionForm({
  open,
  venueId,
  existing,
  onClose,
}: {
  open: boolean;
  venueId: string;
  existing?: VenueEdition | null;
  onClose: () => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>(emptyState());

  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = existing?.id ?? "new";
  if (open && seedKey !== key) {
    setSeedKey(key);
    setForm(existing ? fromEdition(existing) : emptyState());
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const tz = form.timezone;
    const data: EditionInput = {
      venue_id: venueId,
      year: form.year ? Number(form.year) : null,
      cycle_label: form.cycle_label || null,
      location: form.location || null,
      timezone: tz,
      abstract_deadline: localInputToUtcIso(form.abstract_deadline, tz),
      submission_deadline: localInputToUtcIso(form.submission_deadline, tz),
      rebuttal_start: localInputToUtcIso(form.rebuttal_start, tz),
      rebuttal_end: localInputToUtcIso(form.rebuttal_end, tz),
      notification_date: localInputToUtcIso(form.notification_date, tz),
      camera_ready: localInputToUtcIso(form.camera_ready, tz),
      event_start: form.event_start || null,
      event_end: form.event_end || null,
      url: form.url || null,
      notes: form.notes || null,
    };
    if (existing) await updateEdition(existing.id, data);
    else await createEdition(data);
    bump();
    onClose();
  };

  const dtField = (key: (typeof DEADLINE_KEYS)[number], label: string) => (
    <Field label={label}>
      <TextInput
        type="datetime-local"
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );

  return (
    <Modal
      open={open}
      wide
      title={existing ? t("eform.edit") : t("eform.new")}
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
          <Field label={t("eform.year")}>
            <TextInput
              type="number"
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
            />
          </Field>
          <Field label={t("eform.cycle")}>
            <TextInput
              value={form.cycle_label}
              placeholder="2026 / Spring"
              onChange={(e) => set("cycle_label", e.target.value)}
            />
          </Field>
          <Field label={t("eform.tz")}>
            <Select
              value={form.timezone}
              onChange={(e) => set("timezone", e.target.value)}
            >
              {ZONE_OPTIONS.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="rounded-md border border-border bg-surface-sunken p-3">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
            {t("eform.deadlines", { tz: form.timezone })}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {dtField("abstract_deadline", t("dl.abstract"))}
            {dtField("submission_deadline", t("dl.fullpaper"))}
            {dtField("rebuttal_start", t("dl.rebuttalStart"))}
            {dtField("rebuttal_end", t("dl.rebuttalEnd"))}
            {dtField("notification_date", t("dl.notification"))}
            {dtField("camera_ready", t("dl.camera"))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label={t("eform.eventStart")}>
            <TextInput
              type="date"
              value={form.event_start}
              onChange={(e) => set("event_start", e.target.value)}
            />
          </Field>
          <Field label={t("eform.eventEnd")}>
            <TextInput
              type="date"
              value={form.event_end}
              onChange={(e) => set("event_end", e.target.value)}
            />
          </Field>
          <Field label={t("eform.location")}>
            <TextInput
              value={form.location}
              placeholder="San Diego, USA"
              onChange={(e) => set("location", e.target.value)}
            />
          </Field>
        </div>

        <Field label={t("eform.cfpUrl")}>
          <TextInput
            value={form.url}
            placeholder="https://…"
            onChange={(e) => set("url", e.target.value)}
          />
        </Field>
        <Field label={t("common.notes")}>
          <Textarea
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
