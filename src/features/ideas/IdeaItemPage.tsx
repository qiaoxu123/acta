import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deleteIdea, getIdea } from "@/db/repositories/ideas";
import type { Idea } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { IdeaForm } from "./IdeaForm";
import { IdeaDetail } from "./IdeasPage";

/** Dedicated full-width management tab for one research idea. */
export function IdeaItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [x, setX] = useState<Idea | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    setX(null); // drop the previous record so its title can't flash in the breadcrumb
    getIdea(id).then((rec) => {
      setX(rec);
      setLoaded(true);
    });
  }, [id, tick]);

  if (loaded && !x) return <ItemGone listHref="/ideas" />;
  if (!x) return null;

  const remove = async () => {
    if (await confirmDialog(t("idea.confirmDelete", { title: x.title }))) {
      await deleteIdea(x.id);
      useRefresh.getState().bump();
      navigate("/ideas");
    }
  };

  return (
    <>
      <Breadcrumb trail={[{ label: t("nav.ideas"), href: "/ideas" }, { label: x.title }]} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <IdeaDetail idea={x} t={t} wide onEdit={() => setForm(true)} onDelete={remove} />
      </div>
      <IdeaForm
        open={form}
        existing={x}
        onClose={() => setForm(false)}
        onSaved={() => useRefresh.getState().bump()}
      />
    </>
  );
}
