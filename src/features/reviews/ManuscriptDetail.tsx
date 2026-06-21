import { useEffect, useState } from "react";
import { Archive, ArchiveRestore, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/controls";
import { Badge, CountdownBadge } from "@/components/ui/misc";
import {
  archiveManuscript,
  deleteRound,
  listRounds,
} from "@/db/repositories/reviews";
import type { ReviewRound, ReviewedManuscript } from "@/db/types";
import { formatDate, formatDeadline } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { type TFn } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { RoundForm } from "./RoundForm";

const RECT_TONE: Record<string, "ok" | "warn" | "urgent" | "neutral"> = {
  accept: "ok",
  minor: "ok",
  major: "warn",
  reject: "urgent",
};

/**
 * Full management view for one reviewed manuscript: header + actions, review
 * rounds, and a jump-to-review-system link. Rendered both inside the list's
 * right preview panel and full-width in a dedicated item tab.
 */
export function ManuscriptDetail({
  manuscript,
  t,
  onEdit,
  onDelete,
}: {
  manuscript: ReviewedManuscript;
  t: TFn;
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
  const archived = !!manuscript.archived_at;

  const removeRound = async (r: ReviewRound) => {
    if (await confirmDialog(t("rev.confirmDeleteRound", { n: r.round }))) {
      await deleteRound(r.id);
      useRefresh.getState().bump();
    }
  };
  const toggleArchive = async () => {
    await archiveManuscript(manuscript.id, !archived);
    useRefresh.getState().bump();
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-snug text-content">{manuscript.title}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="accent">{t(`role.${manuscript.role}`)}</Badge>
            <Badge>{t(`mstatus.${manuscript.status}`)}</Badge>
            {archived && <Badge tone="neutral">{t("lv.archivedBadge")}</Badge>}
            {manuscript.venue_name && (
              <span className="text-2xs text-content-subtle">{manuscript.venue_name}</span>
            )}
            {manuscript.manuscript_id && (
              <span className="text-2xs text-content-subtle">#{manuscript.manuscript_id}</span>
            )}
          </div>
          {manuscript.review_url && (
            <a
              href={manuscript.review_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-2xs text-accent hover:underline"
            >
              <ExternalLink size={12} /> {t("rev.openSystem")}
            </a>
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="ghost" onClick={toggleArchive} title={archived ? t("lv.unarchive") : t("lv.archive")}>
            {archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
          </Button>
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

      <div className="mt-4 mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">
          {t("rev.rounds")}
        </h3>
        <Button onClick={() => setRoundForm({ open: true })}>
          <Plus size={13} /> {t("rev.addRound")}
        </Button>
      </div>

      {rounds.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-2xs text-content-subtle">
          {t("rev.noRounds")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rounds.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-content">
                    {t("rev.round", { n: r.round })}
                  </span>
                  {r.recommendation && (
                    <Badge tone={RECT_TONE[r.recommendation] ?? "neutral"}>
                      {t(`rec.${r.recommendation}`)}
                    </Badge>
                  )}
                  {r.confidence != null && (
                    <span className="text-2xs text-content-subtle">
                      {t("rev.conf", { n: r.confidence })}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {r.submitted_date ? (
                    <span className="text-2xs text-content-subtle">
                      {t("rev.submittedOn", { d: formatDate(r.submitted_date) })}
                    </span>
                  ) : (
                    r.due_date && (
                      <>
                        <span className="text-2xs text-content-subtle">
                          {t("rev.dueOn", { d: formatDeadline(r.due_date, "local") })}
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
                <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-surface-sunken p-2.5 font-sans text-2xs leading-relaxed text-content-muted">
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
