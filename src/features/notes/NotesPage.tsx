import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, TextInput, Textarea } from "@/components/ui/controls";
import { Badge } from "@/components/ui/misc";
import { Markdown } from "@/components/ui/Markdown";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  archiveNote,
  deleteNote,
  listNotes,
  updateNote,
} from "@/db/repositories/notes";
import type { Note } from "@/db/types";
import { formatDate } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc, cmpStr } from "@/lib/listview";
import { itemHref } from "@/lib/tabs";
import { useRefresh } from "@/store/refresh";
import { NoteForm } from "./NoteForm";

const EMPTY = new Set<string>();
const noop = () => {};
const splitTags = (s: string | null) =>
  (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

const compare = (key: string, a: Note, b: Note) => {
  if (a.pinned !== b.pinned) return b.pinned - a.pinned; // pinned always first
  return key === "title" ? cmpStr(a.title, b.title) : cmpDesc(a.updated_at, b.updated_at);
};

export function NotesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [items, setItems] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState("updated");
  const [form, setForm] = useState<{ open: boolean; edit?: Note | null }>({ open: false });

  useEffect(() => {
    listNotes("active").then(setItems);
  }, [tick]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach((n) => splitTags(n.tags).forEach((tg) => set.add(tg)));
    return [...set].sort();
  }, [items]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = items.filter((n) => {
      if (tag && !splitTags(n.tags).includes(tag)) return false;
      if (!q) return true;
      return [n.title, n.body, n.tags].filter(Boolean).some((s) => s!.toLowerCase().includes(q));
    });
    return arrange(rows, sort, "none", compare, () => ({ key: "", label: "" }));
  }, [items, query, tag, sort]);

  const columns: Column<Note>[] = [
    {
      key: "title",
      label: t("note.title"),
      width: "minmax(0,1fr)",
      sortable: true,
      render: (n) => (
        <span className="flex min-w-0 items-center gap-1.5">
          {n.pinned === 1 && <Pin size={12} className="shrink-0 fill-current text-accent" />}
          <span className="truncate font-medium text-content">{n.title}</span>
        </span>
      ),
    },
    {
      key: "tags",
      label: t("note.tags"),
      width: "minmax(0,1fr)",
      render: (n) => (
        <span className="flex min-w-0 flex-wrap gap-1">
          {splitTags(n.tags).slice(0, 4).map((tg) => (
            <span key={tg} className="rounded bg-surface-sunken px-1.5 py-0.5 text-2xs text-content-subtle">
              #{tg}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "updated",
      label: t("note.updated"),
      width: "104px",
      sortable: true,
      align: "right",
      render: (n) => <span className="text-2xs text-content-subtle">{formatDate(n.updated_at)}</span>,
    },
  ];

  const selected = items.find((n) => n.id === id) ?? null;
  const openItem = (rid: string) => navigate(itemHref("notes", rid));

  const remove = async (n: Note) => {
    if (await confirmDialog(t("note.confirmDelete", { title: n.title }))) {
      await deleteNote(n.id);
      useRefresh.getState().bump();
      if (id === n.id) navigate("/notes");
    }
  };

  return (
    <>
      <Toolbar
        title={t("notes.title")}
        subtitle={t("notes.count", { n: items.length })}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> {t("notes.new")}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-panel px-2 py-1.5">
          <div className="relative w-56">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
            <TextInput
              className="pl-7"
              placeholder={t("notes.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setTag(null)}
                className={clsx(
                  "rounded-full border px-2 py-0.5 text-2xs",
                  !tag ? "border-accent bg-accent-soft text-accent" : "border-border text-content-muted hover:text-content",
                )}
              >
                {t("notes.allTags")}
              </button>
              {allTags.map((tg) => (
                <button
                  key={tg}
                  onClick={() => setTag(tg === tag ? null : tg)}
                  className={clsx(
                    "rounded-full border px-2 py-0.5 text-2xs",
                    tag === tg ? "border-accent bg-accent-soft text-accent" : "border-border text-content-muted hover:text-content",
                  )}
                >
                  #{tg}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto">
            <DataTable
              storageKey="notes"
              columns={columns}
              sections={sections}
              sortKey={sort}
              onSort={setSort}
              getId={(n) => n.id}
              selectedId={id}
              onSelect={openItem}
              collapsed={EMPTY}
              onToggle={noop}
              empty={
                <p className="px-3 py-8 text-center text-2xs text-content-subtle">{t("notes.none")}</p>
              }
            />
          </div>

          <DockPanel selected={!!selected} onOpenInTab={selected ? () => openItem(selected.id) : undefined}>
            {selected && (
              <NoteDetail
                note={selected}
                t={t}
                onEdit={() => setForm({ open: true, edit: selected })}
                onDelete={() => remove(selected)}
              />
            )}
          </DockPanel>
        </div>
      </div>

      <NoteForm
        open={form.open}
        existing={form.edit}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`/notes/item/${savedId}`)}
      />
    </>
  );
}

export function NoteDetail({
  note,
  t,
  onEdit,
  onDelete,
  wide = false,
}: {
  note: Note;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
  wide?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const archived = !!note.archived_at;
  const tags = splitTags(note.tags);

  useEffect(() => {
    setEditing(false);
  }, [note.id]);

  const togglePin = async () => {
    await updateNote(note.id, { pinned: note.pinned === 1 ? 0 : 1 });
    useRefresh.getState().bump();
  };
  const toggleArchive = async () => {
    await archiveNote(note.id, !archived);
    useRefresh.getState().bump();
  };
  const startEdit = () => {
    setDraft(note.body ?? "");
    setEditing(true);
  };
  const saveEdit = async () => {
    await updateNote(note.id, { body: draft });
    setEditing(false);
    useRefresh.getState().bump();
  };

  return (
    <div className={wide ? "mx-auto max-w-3xl p-5" : "p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-snug text-content">{note.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {note.pinned === 1 && (
              <Badge tone="accent">
                <Pin size={10} className="mr-0.5 fill-current" />
                {t("note.pinned")}
              </Badge>
            )}
            {archived && <Badge tone="neutral">{t("lv.archivedBadge")}</Badge>}
            <span className="text-2xs text-content-subtle">{formatDate(note.updated_at)}</span>
          </div>
          {tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {tags.map((tg) => (
                <span key={tg} className="rounded bg-surface-sunken px-1.5 py-0.5 text-2xs text-content-subtle">
                  #{tg}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" onClick={togglePin} title={note.pinned === 1 ? t("dash.unpin") : t("dash.pin")}>
            <Pin size={14} className={note.pinned === 1 ? "fill-current text-accent" : ""} />
          </Button>
          <Button variant="ghost" onClick={toggleArchive} title={archived ? t("lv.unarchive") : t("lv.archive")}>
            {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </Button>
          <Button variant="ghost" onClick={onEdit} title={t("note.editMeta")}>
            <Pencil size={14} />
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      <div className="mt-3">
        {wide && editing ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xs text-content-subtle">{t("idea.markdownHint")}</span>
              <Button className="ml-auto" onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" onClick={saveEdit}>
                {t("common.save")}
              </Button>
            </div>
            <Textarea
              autoFocus
              className="min-h-[60vh] font-mono text-xs leading-relaxed"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  saveEdit();
                }
              }}
            />
          </div>
        ) : note.body?.trim() ? (
          <div
            onDoubleClick={wide ? startEdit : undefined}
            className={wide ? "cursor-text" : ""}
          >
            <Markdown source={note.body} />
          </div>
        ) : (
          <p className="text-2xs text-content-subtle">{t("note.empty")}</p>
        )}
        {wide && !editing && (
          <Button className="mt-3" onClick={startEdit}>
            <Pencil size={13} /> {t("note.editBody")}
          </Button>
        )}
      </div>
    </div>
  );
}
