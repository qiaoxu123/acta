import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  Hash,
  ListTree,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { ResizablePane } from "@/components/layout/ResizablePane";
import { Button, TextInput } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/misc";
import {
  archiveNote,
  createNote,
  deleteNote,
  listNotes,
  updateNote,
  type NoteInput,
} from "@/db/repositories/notes";
import type { Note } from "@/db/types";
import { formatDate } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

// Milkdown is ~1.5MB — load it only when a note is opened.
const MilkdownEditor = lazy(() =>
  import("@/components/ui/MilkdownEditor").then((m) => ({ default: m.MilkdownEditor })),
);

const ALL = "__all__";
const ROOT = "__root__";
const splitTags = (s: string | null) =>
  (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

function buildTree(notes: Note[]): FolderNode[] {
  const roots: FolderNode[] = [];
  const byPath = new Map<string, FolderNode>();
  const ensure = (path: string): FolderNode => {
    const hit = byPath.get(path);
    if (hit) return hit;
    const slash = path.lastIndexOf("/");
    const name = slash === -1 ? path : path.slice(slash + 1);
    const node: FolderNode = { name, path, children: [] };
    byPath.set(path, node);
    if (slash === -1) roots.push(node);
    else ensure(path.slice(0, slash)).children.push(node);
    return node;
  };
  for (const n of notes) if (n.folder?.trim()) ensure(n.folder.trim());
  const sortRec = (ns: FolderNode[]) => {
    ns.sort((a, b) => a.name.localeCompare(b.name, "zh"));
    ns.forEach((x) => sortRec(x.children));
  };
  sortRec(roots);
  return roots;
}

export function NotesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);

  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [folder, setFolder] = useState<string>(ALL);
  const [tag, setTag] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  useEffect(() => {
    listNotes("active").then(setNotes);
  }, [tick]);

  const tree = useMemo(() => buildTree(notes), [notes]);
  const folders = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => n.folder?.trim() && set.add(n.folder.trim()));
    return [...set].sort();
  }, [notes]);
  const tags = useMemo(() => {
    const m = new Map<string, number>();
    notes.forEach((n) => splitTags(n.tags).forEach((tg) => m.set(tg, (m.get(tg) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], "zh"));
  }, [notes]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notes
      .filter((n) => {
        if (folder === ROOT && n.folder?.trim()) return false;
        if (folder !== ALL && folder !== ROOT) {
          const f = n.folder?.trim() ?? "";
          if (f !== folder && !f.startsWith(folder + "/")) return false;
        }
        if (tag && !splitTags(n.tags).includes(tag)) return false;
        if (q && ![n.title, n.body, n.tags, n.folder].filter(Boolean).some((s) => s!.toLowerCase().includes(q)))
          return false;
        return true;
      })
      .sort((a, b) => b.pinned - a.pinned || b.updated_at.localeCompare(a.updated_at));
  }, [notes, query, folder, tag]);

  const selected = notes.find((n) => n.id === id) ?? null;

  const newNote = async () => {
    const inFolder = folder !== ALL && folder !== ROOT ? folder : null;
    const fid = await createNote({
      title: t("note.untitled"),
      body: "",
      tags: "",
      folder: inFolder,
      pinned: 0,
    });
    useRefresh.getState().bump();
    navigate(`/notes/${fid}`);
  };

  const toggleCollapsed = (p: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(p) ? next.delete(p) : next.add(p);
      return next;
    });

  const renderTree = (nodes: FolderNode[], depth: number) =>
    nodes.map((node) => {
      const isOpen = !collapsed.has(node.path);
      const active = folder === node.path;
      return (
        <div key={node.path}>
          <button
            onClick={(e) => {
              e.preventDefault();
              setFolder(node.path);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              toggleCollapsed(node.path);
            }}
            className={clsx(
              "flex w-full items-center gap-1 rounded-md px-2 py-1 text-left text-xs transition-colors",
              active
                ? "bg-accent-soft/60 font-medium text-accent"
                : "text-content-muted hover:bg-surface-raised hover:text-content",
            )}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapsed(node.path);
              }}
              className="shrink-0"
            >
              {node.children.length > 0 ? (
                isOpen ? (
                  <ChevronDown size={12} className="text-content-subtle" />
                ) : (
                  <ChevronRight size={12} className="text-content-subtle" />
                )
              ) : (
                <span className="w-3 shrink-0" />
              )}
            </button>
            {active ? (
              <FolderOpen size={14} className="shrink-0 text-accent" />
            ) : (
              <Folder size={14} className="shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </button>
          {isOpen && node.children.length > 0 && renderTree(node.children, depth + 1)}
        </div>
      );
    });

  return (
    <>
      <Toolbar
        title={t("notes.title")}
        subtitle={t("notes.count", { n: notes.length })}
        actions={
          <Button variant="primary" onClick={newNote}>
            <Plus size={14} /> {t("notes.new")}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1">
        {/* ── Left: folder + tag explorer (pure, Outline-like) ── */}
        <ResizablePane storageKey="acta.w.notes" defaultWidth={220} min={180} max={360}>
          <div className="flex h-full flex-col border-r border-border bg-panel">
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
                <TextInput
                  className="pl-7"
                  placeholder={t("notes.search")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              <button
                onClick={() => setFolder(ALL)}
                className={clsx(
                  "mb-0.5 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                  folder === ALL
                    ? "bg-accent-soft/60 font-medium text-accent"
                    : "text-content-muted hover:bg-surface-raised hover:text-content",
                )}
              >
                <FileText size={14} />
                <span className="flex-1 text-left">{t("notes.allNotes")}</span>
                <span className="text-2xs text-content-subtle">{notes.length}</span>
              </button>

              <p className="mt-3 mb-1 px-2 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
                {t("notes.folders")}
              </p>
              {renderTree(tree, 0)}

              {tags.length > 0 && (
                <>
                  <p className="mt-3 mb-1 px-2 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
                    {t("notes.tags")}
                  </p>
                  <div className="flex flex-wrap gap-1 px-2">
                    {tags.slice(0, 20).map(([tg, n]) => (
                      <button
                        key={tg}
                        onClick={() => setTag(tg === tag ? null : tg)}
                        className={clsx(
                          "rounded-md border px-1.5 py-0.5 text-2xs transition-colors",
                          tag === tg
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-transparent bg-surface-sunken text-content-muted hover:text-content",
                        )}
                      >
                        #{tg}
                        <span className="ml-0.5 text-content-subtle">{n}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </ResizablePane>

        {/* ── Right: content — either a note list (unselected) or the editor ── */}
        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          {selected ? (
            <NoteEditor
              key={selected.id}
              note={selected}
              t={t}
              folders={folders}
              onDeleted={() => navigate("/notes")}
            />
          ) : (
            <NoteList
              notes={visible}
              t={t}
              selectedId={null}
              onSelect={(nid) => navigate(`/notes/${nid}`)}
            />
          )}
        </div>
      </div>
    </>
  );
}

/** Renders when no note is selected — a clean document list, Outline-style. */
function NoteList({
  notes,
  t,
  selectedId,
  onSelect,
}: {
  notes: Note[];
  t: TFn;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (notes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          icon={<FileText size={32} />}
          title={t("notes.none")}
          hint={t("notes.pickHint")}
        />
      </div>
    );
  }
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="mx-auto max-w-3xl">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelect(n.id)}
            className={clsx(
              "flex w-full items-start gap-3 rounded-lg px-4 py-3 text-left transition-colors",
              n.id === selectedId ? "bg-accent-soft/20" : "hover:bg-surface-sunken",
            )}
          >
            <FileText size={16} className="mt-0.5 shrink-0 text-content-subtle" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium text-content">
                {n.title || t("note.untitled")}
              </h3>
              {n.body && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-content-subtle">
                  {n.body.replace(/^#{1,6}\s+/gm, "").replace(/\*\*/g, "").replace(/[*|>-]/g, "").trim().slice(0, 160)}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-2xs text-content-subtle/70">
                <span>{formatDate(n.updated_at)}</span>
                {n.folder && (
                  <span className="flex items-center gap-1">
                    <Folder size={10} />
                    {n.folder}
                  </span>
                )}
                {splitTags(n.tags).slice(0, 3).map((tg) => (
                  <span key={tg}>{tg}</span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Parse `## …` / `### …` headings from the raw Markdown for the outline. */
function extractOutline(md: string): { level: number; text: string }[] {
  return [...md.matchAll(/^(#{2,3})\s+(.+)/gm)].map((m) => ({
    level: m[1].length,
    text: m[2].trim(),
  }));
}

/** Inline editor — Outline-style document with toggleable right outline. */
function NoteEditor({
  note,
  t,
  folders,
  onDeleted,
}: {
  note: Note;
  t: TFn;
  folders: string[];
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(note.title);
  const [folderPath, setFolderPath] = useState<string[]>(() => note.folder?.split("/").filter(Boolean) ?? []);
  const [tags, setTags] = useState(note.tags ?? "");
  const [saving, setSaving] = useState(false);
  const [showOutline, setShowOutline] = useState(false);

  const [bodyText, setBodyText] = useState(note.body ?? "");
  const headings = useMemo(() => extractOutline(bodyText), [bodyText]);

  const patch = useRef<Partial<NoteInput>>({});
  const timer = useRef<number>();

  const flush = async () => {
    window.clearTimeout(timer.current);
    const p = patch.current;
    patch.current = {};
    if (Object.keys(p).length === 0) return;
    await updateNote(note.id, p);
    useRefresh.getState().bump();
    setSaving(false);
  };
  const queue = (p: Partial<NoteInput>) => {
    patch.current = { ...patch.current, ...p };
    setSaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 600);
  };
  useEffect(() => () => void flush(), []);

  const pinned = note.pinned === 1;
  const archived = !!note.archived_at;
  const togglePin = async () => { await updateNote(note.id, { pinned: pinned ? 0 : 1 }); useRefresh.getState().bump(); };
  const toggleArchive = async () => { await archiveNote(note.id, !archived); useRefresh.getState().bump(); };
  const remove = async () => {
    if (await confirmDialog(t("note.confirmDelete", { title: note.title }))) {
      await deleteNote(note.id); useRefresh.getState().bump(); onDeleted();
    }
  };

  // const folderPath = note.folder?.split("/") ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ── Title row (centered, breathing room) ── */}
      <div className="mx-auto w-full max-w-3xl shrink-0 px-10 pt-8 pb-3">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); queue({ title: e.target.value }); }}
          placeholder={t("note.untitled")}
          className="w-full bg-transparent text-2xl font-bold text-content outline-none placeholder:text-content-subtle"
        />

        {/* Metadata row: path breadcrumb + tags + date, Outline-style */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
          {folderPath.length > 0 && (
            <span className="flex items-center gap-1">
              <Folder size={13} className="shrink-0 opacity-60" />
              {folderPath.map((seg, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="opacity-40">/</span>}
                  <input
                    value={i === folderPath.length - 1 ? seg : seg}
                    readOnly={i < folderPath.length - 1}
                    onChange={(e) => {
                      const parts = [...folderPath];
                      parts[i] = e.target.value;
                      setFolderPath(parts);
                      queue({ folder: parts.join("/") || null });
                    }}
                    className={clsx(
                      "bg-transparent text-content outline-none",
                      i < folderPath.length - 1
                        ? "w-auto cursor-default text-content-subtle"
                        : "min-w-[3rem]",
                    )}
                    size={seg.length || 4}
                  />
                </span>
              ))}
            </span>
          )}
          <datalist id="acta-note-folders">
            {folders.map((f) => (<option key={f} value={f} />))}
          </datalist>

          <span className="flex items-center gap-1">
            <Hash size={13} className="shrink-0 opacity-60" />
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onBlur={() => queue({ tags: tags.trim() })}
              placeholder={t("note.tagsHint")}
              className="min-w-0 bg-transparent text-content outline-none placeholder:text-content-subtle"
            />
          </span>

          <div className="ml-auto flex items-center gap-2">
            <span className={clsx(saving ? "text-amber-500" : "opacity-60")}>
              {saving ? t("note.saving") : formatDate(note.updated_at)}
            </span>
            <button
              onClick={() => setShowOutline((v) => !v)}
              title={t("note.outline")}
              className={clsx(
                "rounded p-1 transition-colors hover:bg-surface-sunken",
                showOutline && "bg-accent-soft text-accent",
              )}
            >
              <ListTree size={14} />
            </button>
            <button onClick={togglePin} title={pinned ? t("dash.unpin") : t("dash.pin")} className="rounded p-1 transition-colors hover:bg-surface-sunken">
              <Pin size={14} className={pinned ? "fill-current text-accent" : "opacity-60"} />
            </button>
            <button onClick={toggleArchive} title={archived ? t("lv.unarchive") : t("lv.archive")} className="rounded p-1 transition-colors hover:bg-surface-sunken">
              {archived ? <ArchiveRestore size={14} className="opacity-60" /> : <Archive size={14} className="opacity-60" />}
            </button>
            <button onClick={remove} className="rounded p-1 text-content-subtle transition-colors hover:bg-urgent/10 hover:text-urgent">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Body: centered editor + optional right outline ── */}
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-10 pb-16 pt-2">
            <Suspense
              fallback={
                <div className="animate-pulse space-y-3 py-4">
                  <div className="h-4 w-3/4 rounded bg-surface-sunken" />
                  <div className="h-3 w-1/2 rounded bg-surface-sunken" />
                  <div className="h-3 w-2/3 rounded bg-surface-sunken" />
                </div>
              }
            >
              <MilkdownEditor
                value={note.body ?? ""}
                onChange={(md) => { setBodyText(md); queue({ body: md }); }}
              />
            </Suspense>
          </div>
        </div>

        {/* ── Right outline ── */}
        {showOutline && headings.length > 0 && (
          <aside className="w-52 shrink-0 overflow-y-auto border-l border-border bg-surface-sunken/40 px-3 py-4">
            <h4 className="mb-2 px-1 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
              {t("note.outline")}
            </h4>
            <nav className="space-y-0.5">
              {headings.map((h, i) => (
                <div
                  key={i}
                  className={clsx(
                    "truncate rounded px-2 py-0.5 text-2xs transition-colors hover:text-content",
                    h.level === 2 ? "text-content-muted" : "pl-5 text-content-subtle",
                  )}
                >
                  {h.text}
                </div>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}
