import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deleteManuscript, getManuscript } from "@/db/repositories/reviews";
import type { ReviewedManuscript } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { ManuscriptForm } from "./ManuscriptForm";
import { ManuscriptDetail } from "./ManuscriptDetail";

/** Dedicated full-width management tab for one reviewed manuscript. */
export function ReviewItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [m, setM] = useState<ReviewedManuscript | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    setM(null); // drop the previous record so its title can't flash in the breadcrumb
    getManuscript(id).then((rec) => {
      setM(rec);
      setLoaded(true);
    });
  }, [id, tick]);

  if (loaded && !m) return <ItemGone listHref="/reviews" />;
  if (!m) return null;

  const remove = async () => {
    if (await confirmDialog(t("rev.confirmDelete", { title: m.title }))) {
      await deleteManuscript(m.id);
      useRefresh.getState().bump();
      navigate("/reviews");
    }
  };

  return (
    <>
      <Breadcrumb trail={[{ label: t("nav.reviews"), href: "/reviews" }, { label: m.title }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ManuscriptDetail manuscript={m} t={t} onEdit={() => setForm(true)} onDelete={remove} />
      </div>
      <ManuscriptForm
        open={form}
        existing={m}
        onClose={() => setForm(false)}
        onSaved={() => useRefresh.getState().bump()}
      />
    </>
  );
}
