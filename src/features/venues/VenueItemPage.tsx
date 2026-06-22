import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deleteVenue, getVenue } from "@/db/repositories/venues";
import type { Venue, VenueKind } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { VenueForm } from "./VenueForm";
import { VenueDetail } from "./VenuesPage";

const nameOf = (v: Venue) => v.short_name || v.name;

/** Dedicated full-width management tab for one journal / conference venue. */
export function VenueItemPage({ kind }: { kind: VenueKind }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const section = kind === "journal" ? "journals" : "conferences";
  const base = `/${section}`;
  const [v, setV] = useState<Venue | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    setV(null); // drop the previous record so its title can't flash in the breadcrumb
    getVenue(id).then((rec) => {
      setV(rec);
      setLoaded(true);
    });
  }, [id, tick, section]);

  if (loaded && !v) return <ItemGone listHref={base} />;
  if (!v) return null;

  const remove = async () => {
    if (await confirmDialog(t("vform.confirmDelete", { name: v.name }))) {
      await deleteVenue(v.id);
      useRefresh.getState().bump();
      navigate(base);
    }
  };

  return (
    <>
      <Breadcrumb
        trail={[{ label: t(`nav.${section}`), href: base }, { label: nameOf(v) }]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <VenueDetail venue={v} t={t} onEdit={() => setForm(true)} onDelete={remove} />
      </div>
      <VenueForm
        open={form}
        existing={v}
        defaultKind={kind}
        onClose={() => setForm(false)}
        onSaved={() => useRefresh.getState().bump()}
      />
    </>
  );
}
