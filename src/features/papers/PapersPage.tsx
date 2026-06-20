import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Button } from "@/components/ui/controls";
import { Badge, CountdownBadge, EmptyState } from "@/components/ui/misc";
import {
  deletePaper,
  deleteSubmission,
  listPapers,
  listSubmissions,
} from "@/db/repositories/papers";
import type { Paper, PaperSubmission } from "@/db/types";
import { formatDate, formatDeadline } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useRefresh } from "@/store/refresh";
import { PaperForm } from "./PaperForm";
import { SubmissionForm } from "./SubmissionForm";
import { STATUS_LABEL, STATUS_TONE } from "./paperStatus";

const DECISION_TONE: Record<string, "ok" | "warn" | "urgent" | "neutral" | "accent"> = {
  accept: "ok",
  minor: "ok",
  major: "warn",
  reject: "urgent",
  desk_reject: "urgent",
  pending: "accent",
};

export function PapersPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tick = useRefresh((s) => s.tick);

  const [papers, setPapers] = useState<Paper[]>([]);
  const [form, setForm] = useState<{ open: boolean; edit?: Paper | null }>({
    open: false,
  });

  useEffect(() => {
    listPapers().then(setPapers);
  }, [tick]);

  const selected = papers.find((p) => p.id === id) ?? null;

  const remove = async (p: Paper) => {
    if (await confirmDialog(`Delete paper “${p.title}”?`)) {
      await deletePaper(p.id);
      useRefresh.getState().bump();
      if (id === p.id) navigate("/papers");
    }
  };

  return (
    <>
      <Toolbar
        title="My Papers"
        subtitle={`${papers.length} paper${papers.length === 1 ? "" : "s"}`}
        actions={
          <Button variant="primary" onClick={() => setForm({ open: true })}>
            <Plus size={14} /> New paper
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1">
        <div className="flex w-80 shrink-0 flex-col border-r border-border bg-surface-sunken">
          <ul className="flex-1 overflow-y-auto p-1.5">
            {papers.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => navigate(`/papers/${p.id}`)}
                  className={
                    "mb-0.5 flex w-full flex-col items-start gap-1 rounded-md px-2.5 py-2 text-left transition-colors " +
                    (p.id === id ? "bg-accent-soft" : "hover:bg-surface-raised")
                  }
                >
                  <span className="line-clamp-2 text-xs font-medium text-content">
                    {p.title}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                    {p.target_venue && (
                      <span className="text-2xs text-content-subtle">{p.target_venue}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
            {papers.length === 0 && (
              <p className="px-3 py-6 text-center text-2xs text-content-subtle">
                No papers yet.
              </p>
            )}
          </ul>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto">
          {selected ? (
            <PaperDetail
              paper={selected}
              onEdit={() => setForm({ open: true, edit: selected })}
              onDelete={() => remove(selected)}
            />
          ) : (
            <EmptyState
              icon={<FileText size={28} />}
              title="Select a paper"
              hint="Track each paper's status, submission rounds, and revision deadlines."
            />
          )}
        </div>
      </div>

      <PaperForm
        open={form.open}
        existing={form.edit}
        onClose={() => setForm({ open: false })}
        onSaved={(savedId) => navigate(`/papers/${savedId}`)}
      />
    </>
  );
}

function PaperDetail({
  paper,
  onEdit,
  onDelete,
}: {
  paper: Paper;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tick = useRefresh((s) => s.tick);
  const [subs, setSubs] = useState<PaperSubmission[]>([]);
  const [subForm, setSubForm] = useState<{ open: boolean; edit?: PaperSubmission | null }>(
    { open: false },
  );

  useEffect(() => {
    listSubmissions(paper.id).then(setSubs);
  }, [paper.id, tick]);

  const nextRound = subs.length ? Math.max(...subs.map((s) => s.round)) + 1 : 1;

  const removeSub = async (s: PaperSubmission) => {
    if (await confirmDialog(`Delete round ${s.round}?`)) {
      await deleteSubmission(s.id);
      useRefresh.getState().bump();
    }
  };

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug text-content">{paper.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[paper.status]}>{STATUS_LABEL[paper.status]}</Badge>
            {paper.target_venue && (
              <span className="text-2xs text-content-subtle">→ {paper.target_venue}</span>
            )}
            {paper.started_date && (
              <span className="text-2xs text-content-subtle">
                since {formatDate(paper.started_date)}
              </span>
            )}
          </div>
          {paper.authors && (
            <p className="mt-1 text-2xs text-content-subtle">{paper.authors}</p>
          )}
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

      <div className="mt-2 flex flex-wrap gap-3">
        {paper.overleaf_url && (
          <a
            href={paper.overleaf_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-2xs text-accent hover:underline"
          >
            draft <ExternalLink size={11} />
          </a>
        )}
        {paper.repo_url && (
          <a
            href={paper.repo_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-2xs text-accent hover:underline"
          >
            code <ExternalLink size={11} />
          </a>
        )}
      </div>

      {paper.abstract && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-xs text-content-muted">
          {paper.abstract}
        </p>
      )}

      <div className="mt-5 mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">
          Submission & revision rounds
        </h3>
        <Button onClick={() => setSubForm({ open: true })}>
          <Plus size={13} /> Add round
        </Button>
      </div>

      {subs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-2xs text-content-subtle">
          No submission rounds yet.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l border-border pl-5">
          {subs.map((s) => (
            <li key={s.id} className="relative">
              <span className="absolute -left-[1.42rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
              <div className="rounded-md border border-border bg-surface-raised p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-content">Round {s.round}</span>
                    {s.decision && (
                      <Badge tone={DECISION_TONE[s.decision] ?? "neutral"}>
                        {s.decision.replace("_", " ")}
                      </Badge>
                    )}
                    {s.venue_name && (
                      <span className="text-2xs text-content-subtle">{s.venue_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.revision_deadline && <CountdownBadge iso={s.revision_deadline} />}
                    <Button variant="ghost" onClick={() => setSubForm({ open: true, edit: s })}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="danger" onClick={() => removeSub(s)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 text-2xs text-content-subtle">
                  {s.submitted_date && <span>submitted {formatDate(s.submitted_date)}</span>}
                  {s.decision_date && <span>decided {formatDate(s.decision_date)}</span>}
                  {s.revision_deadline && (
                    <span>revision due {formatDeadline(s.revision_deadline, "local")}</span>
                  )}
                </div>
                {s.reviewer_summary && (
                  <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded bg-surface-sunken p-2.5 font-sans text-2xs leading-relaxed text-content-muted">
                    {s.reviewer_summary}
                  </pre>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      <SubmissionForm
        open={subForm.open}
        paperId={paper.id}
        defaultVenue={paper.target_venue ?? ""}
        nextRound={subForm.edit?.round ?? nextRound}
        existing={subForm.edit}
        onClose={() => setSubForm({ open: false })}
      />
    </div>
  );
}
