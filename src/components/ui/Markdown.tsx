import { marked } from "marked";
import clsx from "clsx";

// GFM (tables, task lists, ~~strike~~) + treat single newlines as <br>, which
// matches how notes are typically typed. Content is the user's own local notes,
// so rendering the parsed HTML directly is safe here.
marked.setOptions({ gfm: true, breaks: true });

/** Render Markdown source as styled HTML (see the `.md` rules in index.css). */
export function Markdown({ source, className }: { source: string; className?: string }) {
  const html = marked.parse(source ?? "", { async: false }) as string;
  return <div className={clsx("md", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
