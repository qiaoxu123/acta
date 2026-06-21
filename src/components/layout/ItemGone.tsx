import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useTabs } from "@/store/tabs";

/** Shown in an item tab whose underlying record was deleted or never existed.
 *  Removes the dead tab from the bar so it doesn't linger. */
export function ItemGone({ listHref, tabId }: { listHref: string; tabId?: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (tabId) useTabs.getState().closeTab(tabId);
  }, [tabId]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <FileQuestion size={28} className="text-content-subtle" />
      <p className="text-xs text-content-muted">{t("item.gone")}</p>
      <Button onClick={() => navigate(listHref)}>{t("item.backToList")}</Button>
    </div>
  );
}
