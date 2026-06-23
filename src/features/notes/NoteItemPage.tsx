import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deleteNote, getNote } from "@/db/repositories/notes";
import type { Note } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { NoteForm } from "./NoteForm";
import { NoteDetail } from "./NotesPage";

/** Dedicated full-width page for one note (Markdown view + inline edit). */
export function NoteItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [n, setN] = useState<Note | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    setN(null);
    getNote(id).then((rec) => {
      setN(rec);
      setLoaded(true);
    });
  }, [id, tick]);

  if (loaded && !n) return <ItemGone listHref="/notes" />;
  if (!n) return null;

  const remove = async () => {
    if (await confirmDialog(t("note.confirmDelete", { title: n.title }))) {
      await deleteNote(n.id);
      useRefresh.getState().bump();
      navigate("/notes");
    }
  };

  return (
    <>
      <Breadcrumb trail={[{ label: t("nav.notes"), href: "/notes" }, { label: n.title }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <NoteDetail note={n} t={t} wide onEdit={() => setForm(true)} onDelete={remove} />
      </div>
      <NoteForm open={form} existing={n} onClose={() => setForm(false)} onSaved={() => useRefresh.getState().bump()} />
    </>
  );
}
