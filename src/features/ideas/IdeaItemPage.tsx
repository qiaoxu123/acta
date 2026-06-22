import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deleteIdea, getIdea } from "@/db/repositories/ideas";
import type { Idea } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { itemTabId } from "@/lib/tabs";
import { useTabs } from "@/store/tabs";
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
    getIdea(id).then((rec) => {
      setX(rec);
      setLoaded(true);
      if (rec) useTabs.getState().setTitle(itemTabId("ideas", id), rec.title);
    });
  }, [id, tick]);

  if (loaded && !x)
    return <ItemGone listHref="/ideas" tabId={id ? itemTabId("ideas", id) : undefined} />;
  if (!x) return null;

  const remove = async () => {
    if (await confirmDialog(t("idea.confirmDelete", { title: x.title }))) {
      await deleteIdea(x.id);
      const next = useTabs.getState().closeTab(itemTabId("ideas", x.id));
      useRefresh.getState().bump();
      navigate(next ?? "/ideas");
    }
  };

  return (
    <>
      <Breadcrumb trail={[{ label: t("nav.ideas"), href: "/ideas" }, { label: x.title }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <IdeaDetail idea={x} t={t} onEdit={() => setForm(true)} onDelete={remove} />
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
