import { useState } from "react";
import clsx from "clsx";
import { Check, FlaskConical, GraduationCap, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import {
  MODULES,
  enabledFromRole,
  useModules,
  type Enabled,
  type ModuleKey,
  type RoleKey,
} from "@/store/modules";

const ROLES: { key: RoleKey; icon: typeof Users }[] = [
  { key: "student", icon: GraduationCap },
  { key: "researcher", icon: FlaskConical },
  { key: "faculty", icon: Users },
  { key: "custom", icon: SlidersHorizontal },
];

/** First-run identity picker → presets which modules are enabled. Overlays the
 *  whole app until the user confirms (no dismiss). */
export function Onboarding() {
  const { t } = useI18n();
  const onboarded = useModules((s) => s.onboarded);
  const complete = useModules((s) => s.complete);
  const [role, setRole] = useState<RoleKey>("researcher");
  const [enabled, setEnabled] = useState<Enabled>(() => enabledFromRole("researcher"));

  if (onboarded) return null;

  const pickRole = (r: RoleKey) => {
    setRole(r);
    setEnabled(enabledFromRole(r));
  };
  const toggle = (k: ModuleKey) => {
    setRole("custom");
    setEnabled((e) => ({ ...e, [k]: !e[k] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <h1 className="text-base font-semibold text-content">{t("ob.title")}</h1>
          <p className="mt-1 text-xs text-content-muted">{t("ob.subtitle")}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
            {t("ob.pickRole")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => pickRole(key)}
                className={clsx(
                  "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                  role === key
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:border-accent/40",
                )}
              >
                <Icon size={18} className={role === key ? "text-accent" : "text-content-muted"} />
                <span className="text-xs font-medium text-content">{t(`role.${key}`)}</span>
                <span className="text-2xs text-content-subtle">{t(`role.${key}.desc`)}</span>
              </button>
            ))}
          </div>

          <p className="mb-2 mt-4 text-2xs font-semibold uppercase tracking-wide text-content-subtle">
            {t("ob.modules")}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {MODULES.map((m) => (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                className={clsx(
                  "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                  enabled[m.key]
                    ? "border-accent/40 bg-accent-soft/40 text-content"
                    : "border-border text-content-subtle",
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
        </div>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <span className="text-2xs text-content-subtle">{t("ob.changeLater")}</span>
          <Button variant="primary" onClick={() => complete(enabled)}>
            {t("ob.start")}
          </Button>
        </div>
      </div>
    </div>
  );
}
