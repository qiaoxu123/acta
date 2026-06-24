import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import {
  AlarmClock,
  Banknote,
  BookText,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Landmark,
  Library,
  Lightbulb,
  Maximize2,
  NotebookPen,
  Pin,
  ScrollText,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Badge, CountdownBadge, EmptyState } from "@/components/ui/misc";
import { loadDashboard, type DashCard, type DashData } from "./summary";
import { formatDeadline } from "@/lib/dates";
import { useI18n, type TFn } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { useDashLayout, type CardSize } from "@/store/dashboard";
import { useModules, type ModuleKey } from "@/store/modules";

interface CardMeta {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  href: string;
  defaultSize: CardSize;
  module: ModuleKey;
}

// Default order: time-sensitive modules first. Default size: things that change
// often get medium (2-wide); slow-moving ones (patents, sparks) start small.
const CARD_META: CardMeta[] = [
  { key: "reviews", icon: Library, labelKey: "nav.reviews", href: "/reviews", defaultSize: "m", module: "reviews" },
  { key: "papers", icon: FileText, labelKey: "nav.papers", href: "/papers", defaultSize: "m", module: "papers" },
  { key: "conferences", icon: CalendarClock, labelKey: "nav.conferences", href: "/conferences", defaultSize: "m", module: "venues" },
  { key: "journals", icon: BookText, labelKey: "nav.journals", href: "/journals", defaultSize: "m", module: "venues" },
  { key: "projects", icon: Landmark, labelKey: "side.projects", href: "/projects/vertical", defaultSize: "m", module: "projects" },
  { key: "ideas", icon: Lightbulb, labelKey: "nav.ideas", href: "/ideas", defaultSize: "m", module: "ideas" },
  { key: "notes", icon: NotebookPen, labelKey: "nav.notes", href: "/notes", defaultSize: "s", module: "notes" },
  { key: "sparks", icon: Sparkles, labelKey: "nav.sparks", href: "/sparks", defaultSize: "s", module: "sparks" },
  { key: "students", icon: Users, labelKey: "nav.students", href: "/students", defaultSize: "s", module: "students" },
  { key: "funding", icon: Banknote, labelKey: "nav.funding", href: "/funding", defaultSize: "s", module: "funding" },
  { key: "patents", icon: ScrollText, labelKey: "nav.patents", href: "/patents", defaultSize: "s", module: "patents" },
];
const DEFAULT_ORDER = CARD_META.map((m) => m.key);
const META = Object.fromEntries(CARD_META.map((m) => [m.key, m]));

// Widget sizing: column span + how many rows the card shows.
const SPAN: Record<CardSize, number> = { s: 1, m: 2, l: 2 };
const ROWS: Record<CardSize, number> = { s: 3, m: 5, l: 10 };
const NEXT_SIZE: Record<CardSize, CardSize> = { s: "m", m: "l", l: "s" };

export function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [data, setData] = useState<DashData | null>(null);

  const order = useDashLayout((s) => s.order);
  const collapsed = useDashLayout((s) => s.collapsed);
  const hidden = useDashLayout((s) => s.hidden);
  const pinned = useDashLayout((s) => s.pinned);
  const sizes = useDashLayout((s) => s.sizes);
  const { toggleCollapsed, hide, show, togglePin, setSize, setOrder } = useDashLayout();
  const enabled = useModules((s) => s.enabled);

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [hiddenMenu, setHiddenMenu] = useState(false);

  useEffect(() => {
    loadDashboard(t).then(setData);
  }, [tick, t]);

  // Merge persisted order with any modules it doesn't know yet; pinned float up.
  const ordered = useMemo(() => {
    const known = new Set(DEFAULT_ORDER);
    const head = order.filter((k) => known.has(k));
    const merged = [...head, ...DEFAULT_ORDER.filter((k) => !head.includes(k))];
    const live = merged.filter(
      (k) => !hidden.includes(k) && (!META[k] || enabled[META[k].module]),
    );
    return [...live.filter((k) => pinned.includes(k)), ...live.filter((k) => !pinned.includes(k))];
  }, [order, hidden, pinned, enabled]);

  const sizeOf = (k: string): CardSize => sizes[k] ?? META[k]?.defaultSize ?? "m";

  const onDrop = (target: string) => {
    if (!dragKey || dragKey === target) return setDragKey(null);
    const known = new Set(DEFAULT_ORDER);
    const head = order.filter((k) => known.has(k));
    const merged = [...head, ...DEFAULT_ORDER.filter((k) => !head.includes(k))];
    merged.splice(merged.indexOf(dragKey), 1);
    merged.splice(merged.indexOf(target), 0, dragKey);
    setOrder(merged);
    setDragKey(null);
  };

  return (
    <>
      <Toolbar
        title={t("dash.title")}
        subtitle={t("dash.subtitle")}
        actions={
          hidden.length > 0 && (
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
                  {hidden.map((k) => {
                    const M = META[k];
                    if (!M) return null;
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
          )
        }
      />

      <div className="flex-1 overflow-y-auto px-3 py-2.5">
        {data && <FocusBar data={data} t={t} onOpen={navigate} />}

        {data && ordered.length === 0 ? (
          <EmptyState icon={<EyeOff size={28} />} title={t("dash.allHidden")} hint={t("dash.allHiddenHint")} />
        ) : (
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gridAutoFlow: "dense",
            }}
          >
            {data &&
              ordered.map((key) => {
                const M = META[key];
                const card = data.cards[key];
                if (!M || !card) return null;
                const size = sizeOf(key);
                return (
                  <Card
                    key={key}
                    meta={M}
                    card={card}
                    t={t}
                    onOpen={navigate}
                    size={size}
                    pinned={pinned.includes(key)}
                    collapsed={collapsed.includes(key)}
                    onToggle={() => toggleCollapsed(key)}
                    onHide={() => hide(key)}
                    onPin={() => togglePin(key)}
                    onResize={() => setSize(key, NEXT_SIZE[size])}
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
    <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-surface-raised px-3 py-2">
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
          <span className="shrink-0 text-2xs text-content-subtle">{formatDeadline(next.date, next.tz)}</span>
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
  size,
  pinned,
  collapsed,
  onToggle,
  onHide,
  onPin,
  onResize,
  dragging,
  onDragStart,
  onDropCard,
}: {
  meta: CardMeta;
  card: DashCard;
  t: TFn;
  onOpen: (h: string) => void;
  size: CardSize;
  pinned: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onHide: () => void;
  onPin: () => void;
  onResize: () => void;
  dragging: boolean;
  onDragStart: () => void;
  onDropCard: () => void;
}) {
  const Icon = meta.icon;
  const shown = card.rows.slice(0, ROWS[size]);
  const more = card.count - shown.length;
  const iconBtn =
    "rounded p-1 text-content-subtle hover:bg-surface-sunken hover:text-content";

  return (
    <section
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropCard}
      style={{ gridColumn: `span ${SPAN[size]}` }}
      className={clsx(
        "flex flex-col rounded-lg border bg-surface-raised",
        pinned ? "border-accent/40" : "border-border",
        dragging && "opacity-40",
      )}
    >
      <header className="group flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
        <GripVertical size={13} className="cursor-grab text-content-subtle/50 group-hover:text-content-subtle" />
        <Icon size={15} className="shrink-0 text-content-muted" />
        <button onClick={() => onOpen(meta.href)} className="truncate text-xs font-semibold text-content hover:text-accent">
          {t(meta.labelKey)}
        </button>
        <span className="rounded bg-surface-sunken px-1.5 text-2xs font-medium text-content-subtle">{card.count}</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={onPin}
            title={pinned ? t("dash.unpin") : t("dash.pin")}
            className={clsx(
              "rounded p-1 hover:bg-surface-sunken",
              pinned
                ? "text-accent"
                : "text-content-subtle opacity-0 transition group-hover:opacity-100 hover:text-content",
            )}
          >
            <Pin size={12} className={pinned ? "fill-current" : ""} />
          </button>
          <button
            onClick={onResize}
            title={`${t("dash.size")} · ${t(`dash.size.${size}`)}`}
            className={clsx(iconBtn, "opacity-0 transition group-hover:opacity-100")}
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={onHide}
            title={t("dash.hide")}
            className={clsx(iconBtn, "opacity-0 transition group-hover:opacity-100")}
          >
            <EyeOff size={12} />
          </button>
          <button onClick={onToggle} title={collapsed ? t("dash.expand") : t("dash.collapse")} className={iconBtn}>
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
