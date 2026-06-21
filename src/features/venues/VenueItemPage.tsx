import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Toolbar } from "@/components/layout/Toolbar";
import { ItemGone } from "@/components/layout/ItemGone";
import { deleteVenue, getVenue } from "@/db/repositories/venues";
import type { Venue, VenueKind } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { itemTabId } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";
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
    getVenue(id).then((rec) => {
      setV(rec);
      setLoaded(true);
      if (rec) useTabs.getState().setTitle(itemTabId(section, id), nameOf(rec));
    });
  }, [id, tick, section]);

  if (loaded && !v)
    return <ItemGone listHref={base} tabId={id ? itemTabId(section, id) : undefined} />;
  if (!v) return null;

  const remove = async () => {
    if (await confirmDialog(t("vform.confirmDelete", { name: v.name }))) {
      await deleteVenue(v.id);
      const next = useTabs.getState().closeTab(itemTabId(section, v.id));
      useRefresh.getState().bump();
      navigate(next ?? base);
    }
  };

  return (
    <>
      <Toolbar title={nameOf(v)} subtitle={t(`kind.${v.kind}`)} />
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
