import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button, Field, TextInput, Textarea } from "@/components/ui/controls";
import { createNote, updateNote } from "@/db/repositories/notes";
import type { Note } from "@/db/types";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

export function NoteForm({
  open,
  existing,
  onClose,
  onSaved,
}: {
  open: boolean;
  existing?: Note | null;
  onClose: () => void;
  onSaved?: (id: string) => void;
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(existing?.title ?? "");
      setTags(existing?.tags ?? "");
      setBody(existing?.body ?? "");
    }
  }, [open, existing]);

  const save = async () => {
    if (!title.trim()) return;
    let id: string;
    if (existing) {
      await updateNote(existing.id, { title: title.trim(), tags: tags.trim() });
      id = existing.id;
    } else {
      id = await createNote({ title: title.trim(), tags: tags.trim(), body, pinned: 0 });
    }
    useRefresh.getState().bump();
    onSaved?.(id);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={existing ? t("note.edit") : t("note.new")}
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
        <Field label={t("note.title")}>
          <TextInput autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label={t("note.tags")}>
          <TextInput
            value={tags}
            placeholder={t("note.tagsHint")}
            onChange={(e) => setTags(e.target.value)}
          />
        </Field>
        {!existing && (
          <Field label={t("note.body")}>
            <Textarea
              rows={6}
              placeholder={t("note.bodyHint")}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
        )}
      </div>
    </Modal>
  );
}
