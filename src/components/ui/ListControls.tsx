import { Archive, ArrowDownUp, Layers } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { ListView } from "@/lib/listview";

export interface Option {
  value: string;
  labelKey: string;
}

/** Compact toolbar for a list pane: sort, group-by, and an active/archived
 *  scope toggle. Used across reviews / papers / venues. */
export function ListControls({
  sortOptions,
  groupOptions,
  view,
  onChange,
  hideSort,
}: {
  sortOptions?: Option[];
  groupOptions: Option[];
  view: ListView;
  onChange: (patch: Partial<ListView>) => void;
  hideSort?: boolean;
}) {
  const { t } = useI18n();
  const archived = view.scope === "archived";

  const selectClass =
    "min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 text-2xs text-content focus:border-accent focus:outline-none";

  return (
    <div className="flex items-center gap-1.5">
      {!hideSort && sortOptions && (
        <div className="flex min-w-0 flex-1 items-center gap-1" title={t("lv.sortBy")}>
          <ArrowDownUp size={12} className="shrink-0 text-content-subtle" />
          <select
            className={selectClass}
            value={view.sort}
            onChange={(e) => onChange({ sort: e.target.value })}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.labelKey)}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-1" title={t("lv.groupBy")}>
        <Layers size={12} className="shrink-0 text-content-subtle" />
        <select
          className={selectClass}
          value={view.group}
          onChange={(e) => onChange({ group: e.target.value })}
        >
          <option value="none">{t("lv.group.none")}</option>
          {groupOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.labelKey)}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={() => onChange({ scope: archived ? "active" : "archived" })}
        title={archived ? t("lv.scope.archived") : t("lv.scope.active")}
        className={
          "flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 text-2xs transition-colors " +
          (archived
            ? "border-accent bg-accent-soft text-accent"
            : "border-border bg-surface text-content-muted hover:text-content")
        }
      >
        <Archive size={12} />
        {archived ? t("lv.scope.archived") : t("lv.scope.active")}
      </button>
    </div>
  );
}
