import { useState } from "react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { Download, Upload } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Button } from "@/components/ui/controls";
import { exportAll, importAll, type Backup } from "@/lib/backup";
import { confirmDialog } from "@/lib/confirm";
import { useRefresh } from "@/store/refresh";

export function SettingsPage() {
  const bump = useRefresh((s) => s.bump);
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
      const count = Object.values(data.tables).reduce((n, t) => n + t.length, 0);
      setMsg(`Exported ${count} records to ${path}`);
    } catch (e) {
      setMsg(`Export failed: ${String(e)}`);
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
      if (
        !(await confirmDialog(
          "Importing will REPLACE all current data with the backup's contents. Continue?",
        ))
      )
        return;
      await importAll(backup);
      bump();
      setMsg(`Imported backup from ${path}`);
    } catch (e) {
      setMsg(`Import failed: ${String(e)}`);
    }
  };

  return (
    <>
      <Toolbar title="Settings" subtitle="Local data & backups" />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="mx-auto max-w-2xl space-y-6">
          <section className="rounded-md border border-border bg-surface-raised p-4">
            <h2 className="text-sm font-semibold text-content">Backup & restore</h2>
            <p className="mt-1 text-xs text-content-muted">
              All data lives locally in a SQLite database. Export a JSON snapshot
              to back it up or move it to another machine. Cloud sync is planned —
              the data model already tracks per-row change metadata for it.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="primary" onClick={doExport}>
                <Download size={14} /> Export JSON
              </Button>
              <Button onClick={doImport}>
                <Upload size={14} /> Import JSON
              </Button>
            </div>
            {msg && (
              <p className="mt-3 break-words rounded bg-surface-sunken p-2 text-2xs text-content-muted">
                {msg}
              </p>
            )}
          </section>

          <section className="rounded-md border border-border bg-surface-raised p-4">
            <h2 className="text-sm font-semibold text-content">About Acta</h2>
            <p className="mt-1 text-xs text-content-muted">
              A local-first academic workflow tracker: journal & conference
              deadlines, peer-review records, and your own paper progress.
            </p>
            <p className="mt-2 text-2xs text-content-subtle">Version 0.1.0</p>
          </section>
        </div>
      </div>
    </>
  );
}
