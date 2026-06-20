import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Library, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Button, Select, TextInput } from "@/components/ui/controls";
import { Badge, CountdownBadge, EmptyState } from "@/components/ui/misc";
import {
  deleteManuscript,
  deleteRound,
  listManuscripts,
  listRounds,
} from "@/db/repositories/reviews";
import type {
  ManuscriptStatus,
  ReviewRound,
  ReviewedManuscript,
} from "@/db/types";
import { formatDate, formatDeadline } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useRefresh } from "@/store/refresh";
import { ManuscriptForm } from "./ManuscriptForm";
import { RoundForm } from "./RoundForm";

const RECT_TONE: Record<string, "ok" | "warn" | "urgent" | "neutral"> = {
  accept: "ok",
  minor: "ok",
  major: "warn",
  reject: "urgent",
};

export function ReviewsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tick = useRefresh((s) => s.tick);

  const [items, setItems] = useState<ReviewedManuscript[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [form, setForm] = useState<{ open: boolean; edit?: ReviewedManuscript | null }>(
    { open: false },
  );

  useEffect(() => {
    listManuscripts().then(setItems);
  }, [tick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((m) => {
      if (statusFilter && m.status !== statusFilter) return false;
      if (!q) return true;
      return [m.title, m.venue_name, m.manuscript_id]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q));
    });
  }, [items, query, statusFilter]);

  const selected = items.find((m) => m.id === id) ?? null;

  const remove = async (m: ReviewedManuscript) => {
    if (await confirmDialog(`Delete review record “${m.title}”?`)) {
      await deleteManuscript(m.id);
      useRefresh.getState().bump();
      if (id === m.id) navigate("/reviews");
    }
  };

  return (
    <>
      <Toolbar
        title="Reviews"
        subtitle={`${items.length} manuscript${items.length === 1 ? "" : "s"}`}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> New review
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1">
        <div className="flex w-80 shrink-0 flex-col border-r border-border bg-surface-sunken">
          <div className="space-y-2 border-b border-border p-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
              <TextInput
                className="pl-7"
                placeholder="Search manuscripts…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              {(["invited", "accepted", "in_progress", "submitted", "declined", "done"] as ManuscriptStatus[]).map(
                (s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ),
              )}
            </Select>
          </div>
          <ul className="flex-1 overflow-y-auto p-1.5">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => navigate(`/reviews/${m.id}`)}
                  className={
                    "mb-0.5 flex w-full flex-col items-start gap-1 rounded-md px-2.5 py-2 text-left transition-colors " +
                    (m.id === id ? "bg-accent-soft" : "hover:bg-surface-raised")
                  }
                >
                  <span className="line-clamp-2 text-xs font-medium text-content">
                    {m.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    {m.venue_name && (
                      <span className="text-2xs text-content-subtle">{m.venue_name}</span>
                    )}
                    <Badge>{m.status.replace("_", " ")}</Badge>
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-2xs text-content-subtle">
                No manuscripts match.
              </p>
            )}
          </ul>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto">
          {selected ? (
            <ManuscriptDetail
              manuscript={selected}
              onEdit={() => setForm({ open: true, edit: selected })}
              onDelete={() => remove(selected)}
            />
          ) : (
            <EmptyState
              icon={<Library size={28} />}
              title="Select a manuscript"
              hint="Track the papers you review, your recommendations, and the comments you gave each round."
            />
          )}
        </div>
      </div>

      <ManuscriptForm
        open={form.open}
        existing={form.edit}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`/reviews/${savedId}`)}
      />
    </>
  );
}

function ManuscriptDetail({
  manuscript,
  onEdit,
  onDelete,
}: {
  manuscript: ReviewedManuscript;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tick = useRefresh((s) => s.tick);
  const [rounds, setRounds] = useState<ReviewRound[]>([]);
  const [roundForm, setRoundForm] = useState<{ open: boolean; edit?: ReviewRound | null }>(
    { open: false },
  );

  useEffect(() => {
    listRounds(manuscript.id).then(setRounds);
  }, [manuscript.id, tick]);

  const nextRound = rounds.length ? Math.max(...rounds.map((r) => r.round)) + 1 : 1;

  const removeRound = async (r: ReviewRound) => {
    if (await confirmDialog(`Delete round ${r.round}?`)) {
      await deleteRound(r.id);
      useRefresh.getState().bump();
    }
  };

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug text-content">
            {manuscript.title}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{manuscript.role}</Badge>
            <Badge>{manuscript.status.replace("_", " ")}</Badge>
            {manuscript.venue_name && (
              <span className="text-2xs text-content-subtle">{manuscript.venue_name}</span>
            )}
            {manuscript.manuscript_id && (
              <span className="text-2xs text-content-subtle">#{manuscript.manuscript_id}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" onClick={onEdit}>
            <Pencil size={14} />
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {manuscript.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-xs text-content-muted">
          {manuscript.notes}
        </p>
      )}

      <div className="mt-5 mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">
          Review rounds
        </h3>
        <Button onClick={() => setRoundForm({ open: true })}>
          <Plus size={13} /> Add round
        </Button>
      </div>

      {rounds.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-2xs text-content-subtle">
          No rounds recorded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {rounds.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-content">Round {r.round}</span>
                  {r.recommendation && (
                    <Badge tone={RECT_TONE[r.recommendation] ?? "neutral"}>
                      {r.recommendation}
                    </Badge>
                  )}
                  {r.confidence != null && (
                    <span className="text-2xs text-content-subtle">conf {r.confidence}/5</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.submitted_date ? (
                    <span className="text-2xs text-content-subtle">
                      submitted {formatDate(r.submitted_date)}
                    </span>
                  ) : (
                    r.due_date && (
                      <>
                        <span className="text-2xs text-content-subtle">
                          due {formatDeadline(r.due_date, "local")}
                        </span>
                        <CountdownBadge iso={r.due_date} />
                      </>
                    )
                  )}
                  <Button variant="ghost" onClick={() => setRoundForm({ open: true, edit: r })}>
                    <Pencil size={12} />
                  </Button>
                  <Button variant="danger" onClick={() => removeRound(r)}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              {r.comments && (
                <pre className="mt-2 max-h-60 overflow-y-auto whitespace-pre-wrap rounded bg-surface-sunken p-2.5 font-sans text-2xs leading-relaxed text-content-muted">
                  {r.comments}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}

      <RoundForm
        open={roundForm.open}
        manuscriptId={manuscript.id}
        nextRound={roundForm.edit?.round ?? nextRound}
        existing={roundForm.edit}
        onClose={() => setRoundForm({ open: false })}
      />
    </div>
  );
}
