import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  AlarmClock,
  BookText,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Landmark,
  LayoutGrid,
  Library,
  Lightbulb,
  Rows3,
  ScrollText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Badge, CountdownBadge, EmptyState } from "@/components/ui/misc";
import { loadDashboard, type DashCard, type DashData } from "./summary";
import { formatDeadline } from "@/lib/dates";
import { useI18n, type TFn } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { useDashLayout } from "@/store/dashboard";

interface CardMeta {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  href: string;
}

// Default order: time-sensitive modules first, research/output after.
const CARD_META: CardMeta[] = [
  { key: "reviews", icon: Library, labelKey: "nav.reviews", href: "/reviews" },
  { key: "papers", icon: FileText, labelKey: "nav.papers", href: "/papers" },
  { key: "conferences", icon: CalendarClock, labelKey: "nav.conferences", href: "/conferences" },
  { key: "journals", icon: BookText, labelKey: "nav.journals", href: "/journals" },
  { key: "projects", icon: Landmark, labelKey: "side.projects", href: "/projects/vertical" },
  { key: "ideas", icon: Lightbulb, labelKey: "nav.ideas", href: "/ideas" },
  { key: "sparks", icon: Sparkles, labelKey: "nav.sparks", href: "/sparks" },
  { key: "patents", icon: ScrollText, labelKey: "nav.patents", href: "/patents" },
];
const DEFAULT_ORDER = CARD_META.map((m) => m.key);
const META = Object.fromEntries(CARD_META.map((m) => [m.key, m]));

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [data, setData] = useState<DashData | null>(null);

  const order = useDashLayout((s) => s.order);
  const collapsed = useDashLayout((s) => s.collapsed);
  const hidden = useDashLayout((s) => s.hidden);
  const density = useDashLayout((s) => s.density);
  const { toggleCollapsed, hide, show, setOrder, setDensity } = useDashLayout();

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [hiddenMenu, setHiddenMenu] = useState(false);

  useEffect(() => {
    loadDashboard(t).then(setData);
  }, [tick, t]);

  // Merge persisted order with any modules it doesn't yet know about.
  const merged = useMemo(() => {
    const known = new Set(DEFAULT_ORDER);
    const head = order.filter((k) => known.has(k));
    return [...head, ...DEFAULT_ORDER.filter((k) => !head.includes(k))];
  }, [order]);
  const visible = merged.filter((k) => !hidden.includes(k));
  const rowsPerCard = density === "comfortable" ? 6 : 4;

  const onDrop = (target: string) => {
    if (!dragKey || dragKey === target) return setDragKey(null);
    const cur = merged.slice();
    cur.splice(cur.indexOf(dragKey), 1);
    cur.splice(cur.indexOf(target), 0, dragKey);
    setOrder(cur);
    setDragKey(null);
  };

  return (
    <>
      <Toolbar
        title={t("dash.title")}
        subtitle={t("dash.subtitle")}
        actions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
              title={t("dash.density")}
              className="rounded-md border border-border p-1.5 text-content-muted hover:text-content"
            >
              {density === "compact" ? <Rows3 size={14} /> : <LayoutGrid size={14} />}
            </button>
            {hidden.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setHiddenMenu((v) => !v)}
                  className="flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-2xs text-content-muted hover:text-content"
                >
                  <Eye size={13} /> {t("dash.showHidden")} ({hidden.length})
                </button>
                {hiddenMenu && (
                  <div
                    className="absolute right-0 z-20 mt-1 w-44 rounded-md border border-border bg-surface-raised p-1 shadow-lg"
                    onMouseLeave={() => setHiddenMenu(false)}
                  >
                    {merged
                      .filter((k) => hidden.includes(k))
                      .map((k) => {
                        const M = META[k];
                        return (
                          <button
                            key={k}
                            onClick={() => {
                              show(k);
                              setHiddenMenu(false);
                            }}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-content-muted hover:bg-surface-sunken hover:text-content"
                          >
                            <M.icon size={14} /> {t(M.labelKey)}
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {data && <FocusBar data={data} t={t} onOpen={navigate} />}

        {data && visible.length === 0 ? (
          <EmptyState icon={<EyeOff size={28} />} title={t("dash.allHidden")} hint={t("dash.allHiddenHint")} />
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
          >
            {data &&
              visible.map((key) => {
                const M = META[key];
                const card = data.cards[key];
                if (!M || !card) return null;
                return (
                  <Card
                    key={key}
                    meta={M}
                    card={card}
                    t={t}
                    onOpen={navigate}
                    rows={rowsPerCard}
                    collapsed={collapsed.includes(key)}
                    onToggle={() => toggleCollapsed(key)}
                    onHide={() => hide(key)}
                    dragging={dragKey === key}
                    onDragStart={() => setDragKey(key)}
                    onDropCard={() => onDrop(key)}
                  />
                );
              })}
          </div>
        )}
      </div>
    </>
  );
}

function FocusBar({ data, t, onOpen }: { data: DashData; t: TFn; onOpen: (h: string) => void }) {
  const { next, stats } = data.focus;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-surface-raised px-3 py-2">
      {next ? (
        <button
          onClick={() => onOpen(next.href)}
          className="flex min-w-0 items-center gap-2 text-xs text-content hover:text-accent"
        >
          <AlarmClock size={14} className="shrink-0 text-accent" />
          <span className="text-content-subtle">{t("dash.focus.next")}</span>
          <span className="truncate font-medium">{next.title}</span>
          <span className="shrink-0 text-content-subtle">{t(`agenda.${next.label}`)}</span>
          <CountdownBadge iso={next.date} />
          <span className="shrink-0 text-2xs text-content-subtle">
            {formatDeadline(next.date, next.tz)}
          </span>
        </button>
      ) : (
        <span className="text-xs text-content-subtle">{t("dash.focus.clear")}</span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {stats
          .filter((s) => s.n > 0)
          .map((s) => (
            <button
              key={s.key}
              onClick={() => onOpen(s.href)}
              className="flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-1 text-2xs text-content-muted hover:text-content"
            >
              {t(`dash.stat.${s.key}`)}
              <span className="font-semibold text-content">{s.n}</span>
            </button>
          ))}
      </div>
    </div>
  );
}

function Card({
  meta,
  card,
  t,
  onOpen,
  rows,
  collapsed,
  onToggle,
  onHide,
  dragging,
  onDragStart,
  onDropCard,
}: {
  meta: CardMeta;
  card: DashCard;
  t: TFn;
  onOpen: (h: string) => void;
  rows: number;
  collapsed: boolean;
  onToggle: () => void;
  onHide: () => void;
  dragging: boolean;
  onDragStart: () => void;
  onDropCard: () => void;
}) {
  const Icon = meta.icon;
  const shown = card.rows.slice(0, rows);
  const more = card.count - shown.length;

  return (
    <section
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropCard}
      className={clsx(
        "flex flex-col rounded-lg border border-border bg-surface-raised",
        dragging && "opacity-40",
      )}
    >
      <header className="group flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
        <GripVertical size={13} className="cursor-grab text-content-subtle/50 group-hover:text-content-subtle" />
        <Icon size={15} className="shrink-0 text-content-muted" />
        <button onClick={() => onOpen(meta.href)} className="text-xs font-semibold text-content hover:text-accent">
          {t(meta.labelKey)}
        </button>
        <span className="rounded bg-surface-sunken px-1.5 text-2xs font-medium text-content-subtle">
          {card.count}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={onHide}
            title={t("dash.hide")}
            className="rounded p-1 text-content-subtle opacity-0 transition hover:bg-surface-sunken hover:text-content group-hover:opacity-100"
          >
            <EyeOff size={13} />
          </button>
          <button onClick={onToggle} title={collapsed ? t("dash.expand") : t("dash.collapse")} className="rounded p-1 text-content-subtle hover:bg-surface-sunken hover:text-content">
            {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </header>

      {card.pills.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2.5 pt-2">
          {card.pills.map((p) => (
            <Badge key={p.label} tone={p.tone}>
              {p.label} {p.n}
            </Badge>
          ))}
        </div>
      )}

      {!collapsed && (
        <div className="flex flex-col px-1.5 pb-1.5 pt-1.5">
          {shown.length === 0 ? (
            <p className="px-1 py-2 text-2xs text-content-subtle">{t("dash.cardEmpty")}</p>
          ) : (
            shown.map((r) => (
              <button
                key={r.id}
                onClick={() => onOpen(r.href)}
                className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-surface-sunken"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-content">{r.title}</p>
                  {r.sub && <p className="truncate text-2xs text-content-subtle">{r.sub}</p>}
                </div>
                {r.date && <CountdownBadge iso={r.date} />}
              </button>
            ))
          )}
          {more > 0 && (
            <button
              onClick={() => onOpen(meta.href)}
              className="mt-0.5 px-1.5 py-1 text-left text-2xs text-accent hover:underline"
            >
              {t("dash.more", { n: more })}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
