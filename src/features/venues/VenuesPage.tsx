import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { DockPanel } from "@/components/layout/DockPanel";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge, CountdownBadge } from "@/components/ui/misc";
import { ListControls } from "@/components/ui/ListControls";
import { DataTable, type Column } from "@/components/ui/DataTable";
import {
  archiveVenue,
  deleteEdition,
  deleteVenue,
  listEditions,
  listVenues,
  venueNextDeadlineMap,
} from "@/db/repositories/venues";
import type { Venue, VenueEdition } from "@/db/types";
import { formatDate, formatDeadline } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useI18n, type TFn } from "@/lib/i18n";
import { arrange, cmpDesc, cmpDue, cmpStr, useListView } from "@/lib/listview";
import { itemTab, itemTabId } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";
import { useRefresh } from "@/store/refresh";
import { VenueForm } from "./VenueForm";
import { EditionForm } from "./EditionForm";

type Row = Venue & { _due: string | null };

const nameOf = (v: Venue) => v.short_name || v.name;

const compare = (key: string, a: Row, b: Row) => {
  switch (key) {
    case "due":
      return cmpDue(a._due, b._due);
    case "updated":
      return cmpDesc(a.updated_at, b.updated_at);
    default:
      return cmpStr(nameOf(a), nameOf(b));
  }
};

export function VenuesPage({ kind }: { kind: "journal" | "conference" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const base = kind === "journal" ? "/journals" : "/conferences";

  const [view, setView] = useListView(`acta.lv.${kind}`, {
    sort: "due",
    group: "none",
    scope: "active",
  });
  const [venues, setVenues] = useState<Venue[]>([]);
  const [dueMap, setDueMap] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [venueForm, setVenueForm] = useState<{ open: boolean; edit?: Venue | null }>({ open: false });

  useEffect(() => {
    listVenues(view.scope).then((all) => setVenues(all.filter((v) => v.kind === kind)));
    venueNextDeadlineMap().then(setDueMap);
  }, [tick, view.scope, kind]);

  const groupOf = (_key: string, v: Row) => ({ key: v.kind, label: t(`kind.${v.kind}`) });

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows: Row[] = venues
      .map((v) => ({ ...v, _due: dueMap[v.id] ?? null }))
      .filter((v) =>
        !q
          ? true
          : [v.name, v.short_name, v.rank, v.publisher]
              .filter(Boolean)
              .some((s) => s!.toLowerCase().includes(q)),
      );
    return arrange(rows, view.sort, view.group, compare, groupOf);
  }, [venues, dueMap, query, view.sort, view.group, t]);

  const columns: Column<Row>[] = [
    {
      key: "name",
      label: t("col.name"),
      width: "minmax(0,1fr)",
      sortable: true,
      render: (v) => <span className="truncate font-medium text-content">{nameOf(v)}</span>,
    },
    {
      key: "rank",
      label: t("col.rank"),
      width: "150px",
      render: (v) =>
        v.rank ? <Badge>{v.rank}</Badge> : <span className="text-content-subtle">—</span>,
    },
    {
      key: "publisher",
      label: t("col.publisher"),
      width: "108px",
      render: (v) => <span className="truncate text-content-muted">{v.publisher || "—"}</span>,
    },
    {
      key: "due",
      label: t("col.nextDeadline"),
      width: "176px",
      sortable: true,
      align: "right",
      render: (v) =>
        v._due ? (
          <>
            <span className="text-2xs text-content-subtle">{formatDate(v._due)}</span>
            <CountdownBadge iso={v._due} />
          </>
        ) : (
          <span className="text-content-subtle">—</span>
        ),
    },
  ];

  const selected = venues.find((v) => v.id === id) ?? null;
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });

  const section = kind === "journal" ? "journals" : "conferences";
  const openItem = (rid: string) => {
    const v = venues.find((x) => x.id === rid);
    const tab = itemTab(section, rid, v ? nameOf(v) : "");
    useTabs.getState().openTab(tab);
    navigate(tab.href);
  };

  const removeVenue = async (v: Venue) => {
    if (await confirmDialog(t("vform.confirmDelete", { name: v.name }))) {
      await deleteVenue(v.id);
      useTabs.getState().closeTab(itemTabId(section, v.id));
      useRefresh.getState().bump();
      if (id === v.id) navigate(base);
    }
  };

  return (
    <>
      <Toolbar
        title={kind === "journal" ? t("nav.journals") : t("nav.conferences")}
        subtitle={t("venues.count", { n: venues.length })}
        actions={
          <Button variant="primary" onClick={() => setVenueForm({ open: true })}>
            <Plus size={14} /> {t("venues.new")}
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-panel px-2 py-1.5">
          <div className="relative w-56">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-2 text-content-subtle" />
            <TextInput
              className="pl-7"
              placeholder={t("venues.search")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ml-auto w-64">
            <ListControls hideSort groupOptions={[]} view={view} onChange={setView} />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-auto">
          <DataTable
            columns={columns}
            sections={sections}
            sortKey={view.sort}
            onSort={(k) => setView({ sort: k })}
            getId={(v) => v.id}
            selectedId={id}
            onSelect={openItem}
            collapsed={collapsed}
            onToggle={toggle}
            empty={
              <p className="px-3 py-8 text-center text-2xs text-content-subtle">
                {view.scope === "archived" ? t("lv.empty.archived") : t("venues.nomatch")}
              </p>
            }
          />
        </div>

        <DockPanel
          selected={!!selected}
          onOpenInTab={selected ? () => openItem(selected.id) : undefined}
        >
          {selected && (
            <VenueDetail
              venue={selected}
              t={t}
              onEdit={() => setVenueForm({ open: true, edit: selected })}
              onDelete={() => removeVenue(selected)}
            />
          )}
        </DockPanel>
        </div>
      </div>

      <VenueForm
        open={venueForm.open}
        existing={venueForm.edit}
        defaultKind={kind}
        onClose={() => setVenueForm({ open: false })}
        onSaved={(savedId) => navigate(`${base}/item/${savedId}`)}
      />
    </>
  );
}

export function VenueDetail({
  venue,
  t,
  onEdit,
  onDelete,
}: {
  venue: Venue;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tick = useRefresh((s) => s.tick);
  const [editions, setEditions] = useState<VenueEdition[]>([]);
  const [editionForm, setEditionForm] = useState<{ open: boolean; edit?: VenueEdition | null }>(
    { open: false },
  );

  useEffect(() => {
    listEditions(venue.id).then(setEditions);
  }, [venue.id, tick]);

  const archived = !!venue.archived_at;

  const removeEdition = async (e: VenueEdition) => {
    if (await confirmDialog(t("eform.confirmDelete"))) {
      await deleteEdition(e.id);
      useRefresh.getState().bump();
    }
  };
  const toggleArchive = async () => {
    await archiveVenue(venue.id, !archived);
    useRefresh.getState().bump();
  };

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-content">{venue.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={venue.kind === "journal" ? "neutral" : "accent"}>
              {t(`kind.${venue.kind}`)}
            </Badge>
            {venue.rank && <Badge>{venue.rank}</Badge>}
            {archived && <Badge tone="neutral">{t("lv.archivedBadge")}</Badge>}
            {venue.publisher && <span className="text-2xs text-content-subtle">{venue.publisher}</span>}
            {venue.url && (
              <a href={venue.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-2xs text-accent hover:underline">
                {t("common.website")} <ExternalLink size={11} />
              </a>
            )}
          </div>
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

      {venue.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-xs text-content-muted">
          {venue.notes}
        </p>
      )}

      <div className="mt-4 mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">
          {t("venues.calls")}
        </h3>
        <Button onClick={() => setEditionForm({ open: true })}>
          <Plus size={13} /> {t("venues.addEdition")}
        </Button>
      </div>

      {editions.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-5 text-center text-2xs text-content-subtle">
          {t("venues.noEditions")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {editions.map((e) => (
            <EditionCard
              key={e.id}
              edition={e}
              t={t}
              onEdit={() => setEditionForm({ open: true, edit: e })}
              onDelete={() => removeEdition(e)}
            />
          ))}
        </ul>
      )}

      <EditionForm
        open={editionForm.open}
        venueId={venue.id}
        existing={editionForm.edit}
        onClose={() => setEditionForm({ open: false })}
      />
    </div>
  );
}

function EditionCard({
  edition,
  t,
  onEdit,
  onDelete,
}: {
  edition: VenueEdition;
  t: TFn;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rows: { label: string; iso: string | null }[] = [
    { label: t("dl.abstract"), iso: edition.abstract_deadline },
    { label: t("dl.fullpaper"), iso: edition.submission_deadline },
    { label: t("dl.rebuttalEnd"), iso: edition.rebuttal_end },
    { label: t("dl.notification"), iso: edition.notification_date },
    { label: t("dl.camera"), iso: edition.camera_ready },
  ].filter((r) => r.iso);

  return (
    <li className="rounded-md border border-border bg-surface-raised p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-content">
          {edition.cycle_label || edition.year || t("venue.edition")}
          {edition.location && (
            <span className="ml-2 font-normal text-content-subtle">{edition.location}</span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" onClick={onEdit}>
            <Pencil size={12} />
          </Button>
          <Button variant="danger" onClick={onDelete}>
            <Trash2 size={12} />
          </Button>
        </div>
      </div>

      {rows.length > 0 && (
        <table className="mt-2 w-full text-2xs">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-0.5 pr-3 text-content-subtle">{r.label}</td>
                <td className="py-0.5 pr-3 text-content-muted">
                  {formatDeadline(r.iso, edition.timezone)}
                </td>
                <td className="py-0.5 text-right">
                  <CountdownBadge iso={r.iso} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </li>
  );
}
