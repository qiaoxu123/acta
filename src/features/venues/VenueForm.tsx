import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, Select, TextInput, Textarea } from "@/components/ui/controls";
import {
  createVenue,
  updateVenue,
  type VenueInput,
} from "@/db/repositories/venues";
import type { Venue } from "@/db/types";
import { useRefresh } from "@/store/refresh";

const EMPTY: VenueInput = {
  name: "",
  short_name: "",
  kind: "conference",
  rank: "",
  publisher: "",
  url: "",
  notes: "",
};

export function VenueForm({
  open,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing?: Venue | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const bump = useRefresh((s) => s.bump);
  const [form, setForm] = useState<VenueInput>(EMPTY);

  // Re-seed the form whenever the modal opens for a (different) record.
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = existing?.id ?? "new";
  if (open && seedKey !== key) {
    setSeedKey(key);
    setForm(
      existing
        ? {
            name: existing.name,
            short_name: existing.short_name ?? "",
            kind: existing.kind,
            rank: existing.rank ?? "",
            publisher: existing.publisher ?? "",
            url: existing.url ?? "",
            notes: existing.notes ?? "",
          }
        : EMPTY,
    );
  }
  if (!open && seedKey !== null) setSeedKey(null);

  const set = <K extends keyof VenueInput>(k: K, v: VenueInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) return;
    let id: string;
    if (existing) {
      await updateVenue(existing.id, form);
      id = existing.id;
    } else {
      id = await createVenue(form);
    }
    bump();
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={existing ? "Edit venue" : "New venue"}
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
        <Field label="Name">
          <TextInput
            autoFocus
            value={form.name}
            placeholder="IEEE Transactions on … / NeurIPS"
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Short name">
            <TextInput
              value={form.short_name ?? ""}
              placeholder="TWC / NeurIPS"
              onChange={(e) => set("short_name", e.target.value)}
            />
          </Field>
          <Field label="Type">
            <Select
              value={form.kind}
              onChange={(e) => set("kind", e.target.value as VenueInput["kind"])}
            >
              <option value="conference">Conference</option>
              <option value="journal">Journal</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rank / tier">
            <TextInput
              value={form.rank ?? ""}
              placeholder="CCF-A / JCR Q1 / 中科院一区"
              onChange={(e) => set("rank", e.target.value)}
            />
          </Field>
          <Field label="Publisher">
            <TextInput
              value={form.publisher ?? ""}
              placeholder="IEEE / ACM / Springer"
              onChange={(e) => set("publisher", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Website">
          <TextInput
            value={form.url ?? ""}
            placeholder="https://…"
            onChange={(e) => set("url", e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <Textarea
            rows={3}
            value={form.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}
