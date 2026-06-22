import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deletePaper, getPaper } from "@/db/repositories/papers";
import type { Paper } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { itemTabId } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";
import { useRefresh } from "@/store/refresh";
import { PaperForm } from "./PaperForm";
import { PaperDetail } from "./PapersPage";

/** Dedicated full-width management tab for one paper. */
export function PaperItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [p, setP] = useState<Paper | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    getPaper(id).then((rec) => {
      setP(rec);
      setLoaded(true);
      if (rec) useTabs.getState().setTitle(itemTabId("papers", id), rec.title);
    });
  }, [id, tick]);

  if (loaded && !p)
    return <ItemGone listHref="/papers" tabId={id ? itemTabId("papers", id) : undefined} />;
  if (!p) return null;

  const remove = async () => {
    if (await confirmDialog(t("pap.confirmDelete", { title: p.title }))) {
      await deletePaper(p.id);
      const next = useTabs.getState().closeTab(itemTabId("papers", p.id));
      useRefresh.getState().bump();
      navigate(next ?? "/papers");
    }
  };

  return (
    <>
      <Breadcrumb trail={[{ label: t("nav.papers"), href: "/papers" }, { label: p.title }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PaperDetail paper={p} t={t} onEdit={() => setForm(true)} onDelete={remove} />
      </div>
      <PaperForm
        open={form}
        existing={p}
        onClose={() => setForm(false)}
        onSaved={() => useRefresh.getState().bump()}
      />
    </>
  );
}
