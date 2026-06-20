import { useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { Download, Upload } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Button } from "@/components/ui/controls";
import { exportAll, importAll, type Backup } from "@/lib/backup";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";

export function SettingsPage() {
  const bump = useRefresh((s) => s.bump);
  const { t } = useI18n();
  const [msg, setMsg] = useState<string | null>(null);

  const doExport = async () => {
    try {
      const data = await exportAll();
      const stamp = new Date().toISOString().slice(0, 10);
      const path = await save({
        defaultPath: `acta-backup-${stamp}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) return;
      await writeTextFile(path, JSON.stringify(data, null, 2));
      const count = Object.values(data.tables).reduce((n, rows) => n + rows.length, 0);
      setMsg(t("set.exported", { n: count, path }));
    } catch (e) {
      setMsg(t("set.exportFail", { e: String(e) }));
    }
  };

  const doImport = async () => {
    try {
      const path = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path || typeof path !== "string") return;
      const text = await readTextFile(path);
      const backup = JSON.parse(text) as Backup;
      if (!(await confirmDialog(t("set.confirmImport")))) return;
      await importAll(backup);
      bump();
      setMsg(t("set.imported", { path }));
    } catch (e) {
      setMsg(t("set.importFail", { e: String(e) }));
    }
  };

  return (
    <>
      <Toolbar title={t("set.title")} subtitle={t("set.subtitle")} />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mx-auto max-w-2xl space-y-6">
          <section className="rounded-md border border-border bg-surface-raised p-4">
            <h2 className="text-sm font-semibold text-content">{t("set.backup")}</h2>
            <p className="mt-1 text-xs text-content-muted">{t("set.backupDesc")}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" onClick={doExport}>
                <Download size={14} /> {t("set.export")}
              </Button>
              <Button onClick={doImport}>
                <Upload size={14} /> {t("set.import")}
              </Button>
            </div>
            {msg && (
              <p className="mt-3 break-words rounded bg-surface-sunken p-2 text-2xs text-content-muted">
                {msg}
              </p>
            )}
          </section>

          <section className="rounded-md border border-border bg-surface-raised p-4">
            <h2 className="text-sm font-semibold text-content">{t("set.about")}</h2>
            <p className="mt-1 text-xs text-content-muted">{t("set.aboutDesc")}</p>
            <p className="mt-2 text-2xs text-content-subtle">{t("set.version")}</p>
          </section>
        </div>
      </div>
    </>
  );
}
