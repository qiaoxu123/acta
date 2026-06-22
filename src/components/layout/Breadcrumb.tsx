import { Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

/** A slim navigation path shown at the top of an item page: section › record. */
export function Breadcrumb({ trail }: { trail: Crumb[] }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1 border-b border-border bg-panel px-4 py-1.5 text-2xs">
      {trail.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <ChevronRight size={11} className="shrink-0 text-content-subtle" />}
          {c.href && i < trail.length - 1 ? (
            <button
              onClick={() => navigate(c.href!)}
              className="shrink-0 text-content-subtle transition-colors hover:text-content"
            >
              {c.label}
            </button>
          ) : (
            <span className="truncate text-content-muted">{c.label}</span>
          )}
        </Fragment>
      ))}
    </div>
  );
}
