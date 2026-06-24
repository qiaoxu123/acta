import { useEffect, useRef } from "react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";
import "katex/dist/katex.min.css"; // Crepe's Latex feature renders math via KaTeX
import "./milkdown.css";

/**
 * Typora-like WYSIWYG Markdown editor (Milkdown Crepe). Renders as-you-type and
 * round-trips standard Markdown. Mount/unmount per note — give it a React `key`
 * of the note id so switching notes loads fresh content. Theming is mapped to
 * the app's CSS tokens in milkdown.css so it follows light/dark.
 */
export function MilkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (markdown: string) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const crepe = new Crepe({ root: host, defaultValue: value ?? "" });
    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown) => onChangeRef.current(markdown));
    });
    crepe.create().catch(() => {
      /* not fatal — editor just won't mount */
    });
    return () => {
      crepe.destroy().catch(() => {});
    };
    // `value` is intentionally read once at mount; the parent keys this by note id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={hostRef} className="acta-md h-full" />;
}
