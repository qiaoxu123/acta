import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  Archive,
  ArchiveRestore,
  CircleHelp,
  Lightbulb,
  Sparkles,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge, EmptyState } from "@/components/ui/misc";
import {
  archiveSpark,
  createSpark,
  deleteSpark,
  listSparks,
  promoteSpark,
} from "@/db/repositories/sparks";
import type { ListScope, Spark, SparkKind } from "@/db/types";
import { formatDate } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { itemHref } from "@/lib/tabs";
import { useRefresh } from "@/store/refresh";

const KIND_ICON = { spark: Lightbulb, problem: CircleHelp } as const;

export function SparksPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [items, setItems] = useState<Spark[]>([]);
  const [scope, setScope] = useState<ListScope>("active");
  const [kind, setKind] = useState<SparkKind>("spark");
  const [text, setText] = useState("");

  useEffect(() => {
    listSparks(scope).then(setItems);
  }, [tick, scope]);

  const add = async () => {
    if (!text.trim()) return;
    await createSpark({ kind, body: text.trim(), tags: "" });
    setText("");
    useRefresh.getState().bump();
  };

  const promote = async (s: Spark) => {
    const ideaId = await promoteSpark(s);
    useRefresh.getState().bump();
    navigate(itemHref("ideas", ideaId));
  };

  const remove = async (s: Spark) => {
    if (await confirmDialog(t("spark.confirmDelete"))) {
      await deleteSpark(s.id);
      useRefresh.getState().bump();
    }
  };

  const sparks = items.filter((s) => s.kind === "spark");
  const problems = items.filter((s) => s.kind === "problem");

  return (
    <>
      <Toolbar
        title={t("sparks.title")}
        subtitle={t("sparks.count", { n: items.length })}
        actions={
          <Button
            variant="ghost"
            onClick={() => setScope(scope === "active" ? "archived" : "active")}
          >
            {scope === "active" ? <Archive size={14} /> : <ArchiveRestore size={14} />}
            {scope === "active" ? t("lv.scope.archived") : t("lv.scope.active")}
          </Button>
        }
      />

      {/* Quick capture */}
      <div className="flex items-center gap-2 border-b border-border bg-panel px-3 py-2">
        <div className="flex shrink-0 overflow-hidden rounded-md border border-border">
          {(["spark", "problem"] as SparkKind[]).map((k) => {
            const Icon = KIND_ICON[k];
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={clsx(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs transition-colors",
                  kind === k
                    ? "bg-accent-soft text-accent"
                    : "bg-surface text-content-muted hover:text-content",
                )}
              >
                <Icon size={13} /> {t(`skind.${k}`)}
              </button>
            );
          })}
        </div>
        <TextInput
          autoFocus
          placeholder={t("sparks.placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button variant="primary" className="shrink-0" onClick={add}>
          {t("sparks.add")}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {items.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={28} />}
            title={t("sparks.empty.title")}
            hint={t("sparks.empty.hint")}
          />
        ) : (
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            <Column kind="spark" rows={sparks} t={t} onPromote={promote} onArchive={archiveSpark} onDelete={remove} scope={scope} />
            <Column kind="problem" rows={problems} t={t} onPromote={promote} onArchive={archiveSpark} onDelete={remove} scope={scope} />
          </div>
        )}
      </div>
    </>
  );
}

function Column({
  kind,
  rows,
  t,
  onPromote,
  onArchive,
  onDelete,
  scope,
}: {
  kind: SparkKind;
  rows: Spark[];
  t: TFn;
  onPromote: (s: Spark) => void;
  onArchive: (id: string, archived: boolean) => Promise<void>;
  onDelete: (s: Spark) => void;
  scope: ListScope;
}) {
  const Icon = KIND_ICON[kind];
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
        <Icon size={13} /> {t(`skind.${kind}`)}
        <span className="ml-1 rounded bg-surface-sunken px-1.5">{rows.length}</span>
      </h2>
      <ul className="space-y-2">
        {rows.map((s) => (
          <li
            key={s.id}
            className="group rounded-md border border-border bg-surface-raised p-3 transition-colors hover:border-accent/40"
          >
            <p className="whitespace-pre-wrap text-xs text-content">{s.body}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xs text-content-subtle">{formatDate(s.created_at)}</span>
              {s.promoted_to && <Badge tone="ok">{t("spark.promoted")}</Badge>}
              <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                {scope === "active" && !s.promoted_to && (
                  <Button variant="ghost" title={t("spark.promote")} onClick={() => onPromote(s)}>
                    <ArrowUpRight size={13} /> {t("spark.promote")}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  title={s.archived_at ? t("lv.unarchive") : t("lv.archive")}
                  onClick={() => {
                    onArchive(s.id, !s.archived_at);
                    useRefresh.getState().bump();
                  }}
                >
                  {s.archived_at ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                </Button>
                <Button variant="danger" onClick={() => onDelete(s)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-md border border-dashed border-border px-3 py-5 text-center text-2xs text-content-subtle">
            {t("sparks.none")}
          </li>
        )}
      </ul>
    </section>
  );
}
