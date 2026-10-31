import { useLayoutEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";

export default function ReviewDiff({
  original,
  modified,
}: {
  original: string;
  modified: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!host.current) return;
    const before = monaco.editor.createModel(original, "chud");
    const after = monaco.editor.createModel(modified, "chud");
    const editor = monaco.editor.createDiffEditor(host.current, {
      readOnly: true,
      automaticLayout: true,
      theme: "chud-dark",
      minimap: { enabled: false },
    });
    editor.setModel({ original: before, modified: after });
    return () => {
      // Monaco's view must detach before its models and services are disposed.
      editor.setModel(null);
      editor.dispose();
      before.dispose();
      after.dispose();
    };
  }, [original, modified]);
  return (
    <div
      ref={host}
      style={{ height: "100%", width: "100%" }}
      aria-label="Replacement diff"
    />
  );
}
