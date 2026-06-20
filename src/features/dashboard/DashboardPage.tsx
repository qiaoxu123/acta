import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CalendarX2,
  FileText,
  Library,
  CheckSquare,
  Presentation,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { CountdownBadge, EmptyState } from "@/components/ui/misc";
import { getAgenda, type AgendaItem } from "@/db/repositories/dashboard";
import { formatDeadline } from "@/lib/dates";
import { useRefresh } from "@/store/refresh";

const KIND_ICON = {
  deadline: CalendarClock,
  event: Presentation,
  review: Library,
  revision: FileText,
  task: CheckSquare,
} as const;

export function DashboardPage() {
  const navigate = useNavigate();
  const tick = useRefresh((s) => s.tick);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getAgenda().then((rows) => {
      setItems(rows);
      setLoaded(true);
    });
  }, [tick]);

  const now = new Date().toISOString();
  const upcoming = items.filter((i) => i.date >= now);
  const past = items.filter((i) => i.date < now).reverse();

  return (
    <>
      <Toolbar
        title="Dashboard"
        subtitle="Everything with a date, in one timeline"
      />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {loaded && items.length === 0 ? (
          <EmptyState
            icon={<CalendarX2 size={28} />}
            title="No deadlines yet"
            hint="Add a venue with a call-for-papers, log a review, or track a paper revision — dated items show up here with live countdowns."
          />
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            <Section title="Upcoming" items={upcoming} onOpen={navigate} />
            {past.length > 0 && (
              <Section title="Past" items={past} onOpen={navigate} muted />
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Section({
  title,
  items,
  onOpen,
  muted,
}: {
  title: string;
  items: AgendaItem[];
  onOpen: (href: string) => void;
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
        {title}
      </h2>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const Icon = KIND_ICON[item.kind];
          return (
            <li
              key={item.id}
              onClick={() => onOpen(item.href)}
              className={
                "flex cursor-pointer items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2 transition-colors hover:border-accent/40 " +
                (muted ? "opacity-60" : "")
              }
            >
              <Icon size={16} className="shrink-0 text-content-subtle" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-content">
                  {item.title}
                </p>
                <p className="truncate text-2xs text-content-subtle">
                  {item.label} · {formatDeadline(item.date, item.timezone)}
                </p>
              </div>
              <CountdownBadge iso={item.date} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
