import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deleteProject, getProject } from "@/db/repositories/projects";
import type { Project, ProjectCategory } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { ProjectForm } from "./ProjectForm";
import { ProjectDetail } from "./ProjectsPage";

/** Dedicated full-width management tab for one project. */
export function ProjectItemPage({ category }: { category: ProjectCategory }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const base = `/projects/${category}`;
  const [p, setP] = useState<Project | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    setP(null); // drop the previous record so its title can't flash in the breadcrumb
    getProject(id).then((rec) => {
      setP(rec);
      setLoaded(true);
    });
  }, [id, tick]);

  if (loaded && !p) return <ItemGone listHref={base} />;
  if (!p) return null;

  const remove = async () => {
    if (await confirmDialog(t("proj.confirmDelete", { name: p.name }))) {
      await deleteProject(p.id);
      useRefresh.getState().bump();
      navigate(base);
    }
  };

  return (
    <>
      <Breadcrumb
        trail={[{ label: t(`nav.projects.${category}`), href: base }, { label: p.name }]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProjectDetail project={p} t={t} onEdit={() => setForm(true)} onDelete={remove} />
      </div>
      <ProjectForm
        open={form}
        existing={p}
        defaultCategory={category}
        onClose={() => setForm(false)}
        onSaved={() => useRefresh.getState().bump()}
      />
    </>
  );
}
