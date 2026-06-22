import type { ReactNode } from "react";
import { openExternal } from "@/lib/external";

/** An external link that opens in the system browser via the opener plugin
 *  (a plain <a target="_blank"> does nothing inside the Tauri webview). */
export function Ext({
  href,
  className,
  title,
  children,
}: {
  href: string;
  className?: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      title={title}
      onClick={(e) => {
        e.preventDefault();
        openExternal(href);
      }}
      className={className}
    >
      {children}
    </a>
  );
}
