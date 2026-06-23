import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ItemGone } from "@/components/layout/ItemGone";
import { deleteReport, getReport } from "@/db/repositories/reports";
import type { Report } from "@/db/types";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { ReportForm } from "./ReportForm";
import { ReportDetail } from "./ReportsPage";

/** Dedicated full-width page for one work report. */
export function ReportItemPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const tick = useRefresh((s) => s.tick);
  const [r, setR] = useState<Report | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoaded(false);
    setR(null);
    getReport(id).then((rec) => {
      setR(rec);
      setLoaded(true);
    });
  }, [id, tick]);

  if (loaded && !r) return <ItemGone listHref="/reports" />;
  if (!r) return null;

  const remove = async () => {
    if (await confirmDialog(t("report.confirmDelete", { title: r.title }))) {
      await deleteReport(r.id);
      useRefresh.getState().bump();
      navigate("/reports");
    }
  };

  return (
    <>
      <Breadcrumb trail={[{ label: t("nav.reports"), href: "/reports" }, { label: r.title }]} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ReportDetail report={r} t={t} wide onEdit={() => setForm(true)} onDelete={remove} />
      </div>
      <ReportForm open={form} existing={r} onClose={() => setForm(false)} onSaved={() => useRefresh.getState().bump()} />
    </>
  );
}
