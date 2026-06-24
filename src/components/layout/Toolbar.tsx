import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePageHeader } from "@/store/pageHeader";

/**
 * A page's header. Rather than rendering its own band (which wasted a strip
 * under the title bar), it portals its subtitle + actions into the top bar's
 * slot next to the breadcrumb. The breadcrumb already serves as the title, so
 * `title` is accepted but not drawn as a heading.
 */
export function Toolbar({
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const el = usePageHeader((s) => s.el);
  if (!el) return null;
  return createPortal(
    <>
      {subtitle && <span className="truncate text-2xs text-content-subtle">{subtitle}</span>}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </>,
    el,
  );
}
