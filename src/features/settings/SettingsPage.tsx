import { useEffect, useState } from "react";
import clsx from "clsx";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";
import { fetch } from "@tauri-apps/plugin-http";
import { Blocks, Check, Cloud, Database, Download, Plus, RefreshCw, Upload, Users, X } from "lucide-react";
import { Toolbar } from "@/components/layout/Toolbar";
import { Button, Field, TextInput } from "@/components/ui/controls";
import { MODULES, enabledFromRole, useModules, type RoleKey } from "@/store/modules";
import { exportAll, importAll, type Backup } from "@/lib/backup";
import { confirmDialog } from "@/lib/confirm";
import { useI18n } from "@/lib/i18n";
import { useRefresh } from "@/store/refresh";
import { loadDav, loadPg, saveDav, savePg, type PgConfig, type WebDavConfig } from "@/sync/config";
import { davCheck } from "@/sync/webdav";
import { useSync, startAutoSync } from "@/sync/store";
import { addMember, createGroup, listGroups, listMembers, removeMember } from "@/db/repositories/groups";
import { findUser } from "@/db/repositories/users";
import { useAuth } from "@/store/auth";

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
      const path = await open({ multiple: false, filters: [{ name: "JSON", extensions: ["json"] }] });
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
          <ModulesSection />
          <GroupsSection />
          <PgSyncSection />
          <SyncSection />

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

const ROLE_KEYS: RoleKey[] = ["student", "researcher", "faculty", "custom"];

function PgSyncSection() {
  const { t } = useI18n();
  const [cfg, setCfg] = useState<PgConfig>(() => loadPg());
  const [note, setNote] = useState<string | null>(null);

  const set = <K extends keyof PgConfig>(k: K, v: PgConfig[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const persist = () => {
    savePg(cfg);
    setNote(t("set.pgSaved"));
    if (cfg.enabled) startAutoSync();
  };
  // Quick connectivity probe: GET the snapshot endpoint; a 200 or 404 means
  // the API is reachable and the token is valid (401/403 = auth fail).
  const test = async () => {
    savePg(cfg);
    try {
      const res = await fetch(`${cfg.apiUrl}/snapshot`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${cfg.token}`,
          "content-type": "application/json",
        },
      });
      if (res.status === 401 || res.status === 403)
        setNote(t("set.pgAuthFail", { code: res.status }));
      else if (res.status >= 500)
        setNote(t("set.pgServerError", { code: res.status }));
      else
        setNote(t("set.davOk"));
    } catch (e) {
      setNote(String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <section className="rounded-md border border-border bg-surface-raised p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-content">
        <Database size={15} /> {t("set.pgSync")}
      </h2>
      <p className="mt-1 text-xs text-content-muted">{t("set.pgSyncDesc")}</p>

      <label className="mt-3 flex items-center gap-2 text-xs text-content">
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        {t("set.pgEnable")}
      </label>

      <div className="mt-3 space-y-3">
        <Field label={t("set.pgUrl")}>
          <TextInput
            value={cfg.apiUrl}
            placeholder="https://your-server.com:3001"
            onChange={(e) => set("apiUrl", e.target.value)}
          />
        </Field>
        <Field label={t("set.pgToken")}>
          <TextInput
            type="password"
            value={cfg.token}
            placeholder={t("set.pgTokenHint")}
            onChange={(e) => set("token", e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={persist}>
          {t("common.save")}
        </Button>
        <Button onClick={test}>{t("set.davTest")}</Button>
      </div>

      {note && (
        <p className="mt-2 break-words rounded bg-surface-sunken p-2 text-2xs text-content-muted">
          {note}
        </p>
      )}
    </section>
  );
}

function GroupsSection() {
  const { t } = useI18n();
  const session = useAuth((s) => s.session);
  const userId = session && typeof session === 'object' ? session.user_id : null;
  const [groups, setGroups] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Record<string, any[]>>({});
  const [addUser, setAddUser] = useState<Record<string, string>>({});
  const load = async () => {
    const gs = await listGroups();
    setGroups(gs);
  };
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!name.trim() || !userId) return;
    await createGroup(name, userId);
    setName("");
    load();
  };
  const addM = async (gid: string) => {
    const uname = (addUser[gid] || "").trim();
    if (!uname) return;
    const u = await findUser(uname);
    if (!u) return;
    await addMember(gid, u.id);
    setAddUser((p) => ({ ...p, [gid]: "" }));
    const ms = await listMembers(gid);
    setMembers((p) => ({ ...p, [gid]: ms }));
  };
  const rmM = async (gid: string, uid: string) => {
    await removeMember(gid, uid);
    const ms = await listMembers(gid);
    setMembers((p) => ({ ...p, [gid]: ms }));
  };
  const toggleMembers = async (gid: string) => {
    if (members[gid]) { setMembers((p) => { const n = { ...p }; delete n[gid]; return n; }); }
    else { const ms = await listMembers(gid); setMembers((p) => ({ ...p, [gid]: ms })); }
  };

  return (
    <section className="rounded-md border border-border bg-surface-raised p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-content">
        <Users size={15} /> {t("groups.title")}
      </h2>
      <p className="mt-1 text-xs text-content-muted">{t("groups.desc")}</p>
      <div className="mt-3 flex gap-2">
        <TextInput className="flex-1" placeholder={t("groups.nameHint")} value={name} onChange={(e) => setName(e.target.value)} />
        <Button variant="primary" onClick={create}><Plus size={14} /> {t("groups.create")}</Button>
      </div>
      {groups.length > 0 && (
        <div className="mt-3 space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="rounded-md border border-border bg-surface-sunken/40 p-2">
              <div className="flex items-center justify-between">
                <button onClick={() => toggleMembers(g.id)} className="text-xs font-medium text-content hover:text-accent">{g.name}</button>
                <span className="text-2xs text-content-subtle">{members[g.id]?.length ?? "—"} members</span>
              </div>
              {members[g.id] && (
                <div className="mt-2 space-y-1">
                  {members[g.id].map((m: any) => (
                    <div key={m.user_id} className="flex items-center justify-between rounded bg-surface px-2 py-0.5 text-2xs text-content-muted">
                      <span>{m.user_id === g.created_by ? "👑 " : ""}{m.user_id}</span>
                      {m.role === 'owner' ? <span className="text-content-subtle">{t("groups.owner")}</span> : (
                        <button onClick={() => rmM(g.id, m.user_id)} className="text-urgent hover:underline"><X size={11} /></button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-1">
                    <TextInput className="flex-1 text-2xs" placeholder={t("groups.addUserHint")} value={addUser[g.id] || ""} onChange={(e) => setAddUser((p) => ({ ...p, [g.id]: e.target.value }))} />
                    <Button onClick={() => addM(g.id)}>{t("groups.addUser")}</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ModulesSection() {
  const { t } = useI18n();
  const enabled = useModules((s) => s.enabled);
  const setEnabled = useModules((s) => s.setEnabled);
  const complete = useModules((s) => s.complete);

  return (
    <section className="rounded-md border border-border bg-surface-raised p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-content">
        <Blocks size={15} /> {t("set.modules")}
      </h2>
      <p className="mt-1 text-xs text-content-muted">{t("set.modulesDesc")}</p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-2xs text-content-subtle">{t("set.applyRole")}:</span>
        {ROLE_KEYS.map((r) => (
          <button
            key={r}
            onClick={() => complete(enabledFromRole(r))}
            className="rounded-full border border-border px-2.5 py-1 text-2xs text-content-muted hover:border-accent/40 hover:text-content"
          >
            {t(`role.${r}`)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {MODULES.map((m) => (
          <button
            key={m.key}
            onClick={() => setEnabled(m.key, !enabled[m.key])}
            className={clsx(
              "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
              enabled[m.key] ? "border-accent/40 bg-accent-soft/40 text-content" : "border-border text-content-subtle",
            )}
          >
            <span
              className={clsx(
                "grid h-4 w-4 place-items-center rounded border",
                enabled[m.key] ? "border-accent bg-accent text-accent-fg" : "border-border",
              )}
            >
              {enabled[m.key] && <Check size={11} />}
            </span>
            {t(m.labelKey)}
          </button>
        ))}
      </div>
    </section>
  );
}

function SyncSection() {
  const { t } = useI18n();
  const [cfg, setCfg] = useState<WebDavConfig>(() => loadDav());
  const [note, setNote] = useState<string | null>(null);
  const sync = useSync((s) => s.sync);
  const syncing = useSync((s) => s.syncing);
  const lastSync = useSync((s) => s.lastSync);
  const lastResult = useSync((s) => s.lastResult);
  const error = useSync((s) => s.error);

  const set = <K extends keyof WebDavConfig>(k: K, v: WebDavConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const persist = () => {
    saveDav(cfg);
    setNote(t("set.davSaved"));
    if (cfg.enabled) startAutoSync();
  };
  const test = async () => {
    saveDav(cfg);
    try {
      await davCheck(cfg);
      setNote(t("set.davOk"));
    } catch (e) {
      setNote(String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <section className="rounded-md border border-border bg-surface-raised p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-content">
        <Cloud size={15} /> {t("set.sync")}
      </h2>
      <p className="mt-1 text-xs text-content-muted">{t("set.syncDesc")}</p>

      <label className="mt-3 flex items-center gap-2 text-xs text-content">
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => set("enabled", e.target.checked)}
        />
        {t("set.davEnable")}
      </label>

      <div className="mt-3 space-y-3">
        <Field label={t("set.davUrl")}>
          <TextInput
            value={cfg.url}
            placeholder="https://dav.jianguoyun.com/dav/acta/"
            onChange={(e) => set("url", e.target.value)}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("set.davUser")}>
            <TextInput value={cfg.username} onChange={(e) => set("username", e.target.value)} />
          </Field>
          <Field label={t("set.davPass")}>
            <TextInput
              type="password"
              value={cfg.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={persist}>
          {t("common.save")}
        </Button>
        <Button onClick={test}>{t("set.davTest")}</Button>
        <Button onClick={() => sync()} disabled={syncing || !cfg.enabled}>
          <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />{" "}
          {syncing ? t("set.syncing") : t("set.syncNow")}
        </Button>
        <span className="text-2xs text-content-subtle">
          {t("set.lastSync", { t: lastSync ? new Date(lastSync).toLocaleString() : t("set.syncNever") })}
          {lastResult ? `  (${lastResult})` : ""}
        </span>
      </div>

      {(note || error) && (
        <p
          className={
            "mt-2 break-words rounded p-2 text-2xs " +
            (error ? "bg-urgent/10 text-urgent" : "bg-surface-sunken text-content-muted")
          }
        >
          {error || note}
        </p>
      )}
    </section>
  );
}
