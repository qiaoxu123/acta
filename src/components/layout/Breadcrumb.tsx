import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useBreadcrumb, type Crumb } from "@/store/breadcrumb";

export type { Crumb };

/**
 * Headless: an item page declares its path (section › record) and this publishes
 * it to the breadcrumb store so the top bar renders it. Renders nothing itself —
 * the path now lives in the wolai-style top bar, not under the page.
 */
export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  const { pathname } = useLocation();
  const publish = useBreadcrumb((s) => s.publish);
  const clear = useBreadcrumb((s) => s.clear);
  const sig = JSON.stringify(trail);

  useEffect(() => {
    publish(pathname, trail);
    return () => clear(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, sig]);

  return null;
}
