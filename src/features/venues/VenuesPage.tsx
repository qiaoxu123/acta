import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarClock,
  ExternalLink,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Button, TextInput } from "@/components/ui/controls";
import { Badge, CountdownBadge, EmptyState } from "@/components/ui/misc";
import {
  deleteEdition,
  deleteVenue,
  listEditions,
  listVenues,
} from "@/db/repositories/venues";
import type { Venue, VenueEdition } from "@/db/types";
import { formatDeadline } from "@/lib/dates";
import { confirmDialog } from "@/lib/confirm";
import { useRefresh } from "@/store/refresh";
import { VenueForm } from "./VenueForm";
import { EditionForm } from "./EditionForm";

export function VenuesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tick = useRefresh((s) => s.tick);

  const [venues, setVenues] = useState<Venue[]>([]);
  const [query, setQuery] = useState("");
  const [venueForm, setVenueForm] = useState<{ open: boolean; edit?: Venue | null }>(
    { open: false },
  );

  useEffect(() => {
    listVenues().then(setVenues);
  }, [tick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((v) =>
      [v.name, v.short_name, v.rank, v.publisher]
        .filter(Boolean)
        .some((s) => s!.toLowerCase().includes(q)),
    );
  }, [venues, query]);

  const selected = venues.find((v) => v.id === id) ?? null;

  const removeVenue = async (v: Venue) => {
    if (
      await confirmDialog(
        `Delete “${v.name}” and all its editions? This cannot be undone.`,
      )
    ) {
      await deleteVenue(v.id);
      useRefresh.getState().bump();
      if (id === v.id) navigate("/venues");
    }
  };

  return (
    <>
      <Toolbar
        title="Venues & Deadlines"
        subtitle={`${venues.length} venue${venues.length === 1 ? "" : "s"}`}
        actions={
          <Button variant="primary" onClick={() => setVenueForm({ open: true })}>
            <Plus size={14} /> New venue
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1">
        {/* List pane */}
        <div className="flex w-72 shrink-0 flex-col border-r border-border bg-surface-sunken">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-2 text-content-subtle"
              />
              <TextInput
                className="pl-7"
                placeholder="Search venues…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto p-1.5">
            {filtered.map((v) => (
              <li key={v.id}>
                <button
                  onClick={() => navigate(`/venues/${v.id}`)}
                  className={
                    "mb-0.5 flex w-full flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors " +
                    (v.id === id
                      ? "bg-accent-soft"
                      : "hover:bg-surface-raised")
                  }
                >
                  <span className="flex w-full items-center gap-1.5">
                    <span className="truncate text-xs font-medium text-content">
                      {v.short_name || v.name}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Badge tone={v.kind === "journal" ? "neutral" : "accent"}>
                      {v.kind}
                    </Badge>
                    {v.rank && <Badge>{v.rank}</Badge>}
                  </span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-2xs text-content-subtle">
                No venues match.
              </p>
            )}
          </ul>
        </div>

        {/* Detail pane */}
        <div className="min-w-0 flex-1 overflow-y-auto">
          {selected ? (
            <VenueDetail
              venue={selected}
              onEdit={() => setVenueForm({ open: true, edit: selected })}
              onDelete={() => removeVenue(selected)}
            />
          ) : (
            <EmptyState
              icon={<CalendarClock size={28} />}
              title="Select a venue"
              hint="Pick a venue to see its calls for papers and deadlines, or create a new one."
            />
          )}
        </div>
      </div>

      <VenueForm
        open={venueForm.open}
        existing={venueForm.edit}
        onClose={() => setVenueForm({ open: false })}
        onSaved={(savedId) => navigate(`/venues/${savedId}`)}
      />
    </>
  );
}

function VenueDetail({
  venue,
  onEdit,
  onDelete,
}: {
  venue: Venue;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tick = useRefresh((s) => s.tick);
  const [editions, setEditions] = useState<VenueEdition[]>([]);
  const [editionForm, setEditionForm] = useState<{
    open: boolean;
    edit?: VenueEdition | null;
  }>({ open: false });

  useEffect(() => {
    listEditions(venue.id).then(setEditions);
  }, [venue.id, tick]);

  const removeEdition = async (e: VenueEdition) => {
    if (await confirmDialog("Delete this edition?")) {
      await deleteEdition(e.id);
      useRefresh.getState().bump();
    }
  };

  return (
    <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-content">{venue.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={venue.kind === "journal" ? "neutral" : "accent"}>
              {venue.kind}
            </Badge>
            {venue.rank && <Badge>{venue.rank}</Badge>}
            {venue.publisher && (
              <span className="text-2xs text-content-subtle">{venue.publisher}</span>
            )}
            {venue.url && (
              <a
                href={venue.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-2xs text-accent hover:underline"
              >
                website <ExternalLink size={11} />
              </a>
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

      {venue.notes && (
        <p className="mt-3 whitespace-pre-wrap rounded-md bg-surface-sunken p-3 text-xs text-content-muted">
          {venue.notes}
        </p>
      )}

      <div className="mt-5 mb-2 flex items-center justify-between">
        <h3 className="text-2xs font-semibold uppercase tracking-wide text-content-subtle">
          Calls for papers
        </h3>
        <Button onClick={() => setEditionForm({ open: true })}>
          <Plus size={13} /> Add edition
        </Button>
      </div>

      {editions.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-2xs text-content-subtle">
          No deadlines tracked yet for this venue.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {editions.map((e) => (
            <EditionCard
              key={e.id}
              edition={e}
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
  onEdit,
  onDelete,
}: {
  edition: VenueEdition;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rows: { label: string; iso: string | null }[] = [
    { label: "Abstract", iso: edition.abstract_deadline },
    { label: "Full paper", iso: edition.submission_deadline },
    { label: "Rebuttal end", iso: edition.rebuttal_end },
    { label: "Notification", iso: edition.notification_date },
    { label: "Camera-ready", iso: edition.camera_ready },
  ].filter((r) => r.iso);

  return (
    <li className="rounded-md border border-border bg-surface-raised p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-semibold text-content">
          {edition.cycle_label || edition.year || "Edition"}
          {edition.location && (
            <span className="ml-2 font-normal text-content-subtle">
              {edition.location}
            </span>
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
