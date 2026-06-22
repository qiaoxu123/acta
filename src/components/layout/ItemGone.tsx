import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";

/** Shown on an item page whose underlying record was deleted or never existed. */
export function ItemGone({ listHref }: { listHref: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <FileQuestion size={28} className="text-content-subtle" />
      <p className="text-xs text-content-muted">{t("item.gone")}</p>
      <Button onClick={() => navigate(listHref)}>{t("item.backToList")}</Button>
    </div>
  );
}
