import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deletePatent, getPatent } from "@/db/repositories/patents";
import type { Patent } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { PatentForm } from "./PatentForm";
import { PatentDetail } from "./PatentsPage";

/** Dedicated full-width management tab for one patent. */
export function PatentItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [p, setP] = useState<Patent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    setP(null); // drop the previous record so its title can't flash in the breadcrumb
    getPatent(id).then((rec) => {
      setP(rec);
      setLoaded(true);
    });
  }, [id, tick]);

  if (loaded && !p) return <ItemGone listHref="/patents" />;
  if (!p) return null;

  const remove = async () => {
    if (await confirmDialog(t("pat.confirmDelete", { title: p.title }))) {
      await deletePatent(p.id);
      useRefresh.getState().bump();
      navigate("/patents");
    }
  };

  return (
    <>
      <Breadcrumb trail={[{ label: t("nav.patents"), href: "/patents" }, { label: p.title }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <PatentDetail patent={p} t={t} onEdit={() => setForm(true)} onDelete={remove} />
      </div>
      <PatentForm
        open={form}
        existing={p}
        onClose={() => setForm(false)}
        onSaved={() => useRefresh.getState().bump()}
      />
    </>
  );
}
