/// <reference types="vite/client" />
import React from "react";
import { createRoot } from "react-dom/client";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/editor/edcore.main";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import App from "./App";
import "./style.css";
import { libraries } from "./libraries";

(self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
loader.config({ monaco });
monaco.languages.register({ id: "chud", extensions: [".chud", ".CHUD"] });
monaco.languages.setMonarchTokensProvider("chud", {
  keywords: [
    "chud",
    "use",
    "public",
    "func",
    "let",
    "mut",
    "const",
    "if",
    "else",
    "for",
    "in",
    "while",
    "loop",
    "break",
    "continue",
    "return",
  ],
  tokenizer: {
    root: [
      [/\/\*/, "comment", "@comment"],
      [/\/\/.*$/, "comment"],
      [
        /[a-zA-Z_]\w*/,
        { cases: { "@keywords": "keyword", "@default": "identifier" } },
      ],
      [/"(?:[^"\\]|\\.)*"/, "string"],
      [/\d+/, "number"],
      [/[{}()[\]]/, "@brackets"],
      [/[+\-*/%=!<>|&]+/, "operator"],
    ],
    comment: [
      [/[^/*]+/, "comment"],
      [/\*\//, "comment", "@pop"],
      [/[/*]/, "comment"],
    ],
  },
});
monaco.languages.setLanguageConfiguration("chud", {
  comments: { lineComment: "//", blockComment: ["/*", "*/"] },
  brackets: [
    ["{", "}"],
    ["(", ")"],
    ["[", "]"],
  ],
  autoClosingPairs: [
    { open: "{", close: "}" },
    { open: "(", close: ")" },
    { open: '"', close: '"' },
  ],
});
monaco.languages.registerCompletionItemProvider("chud", {
  triggerCharacters: ["."],
  provideCompletionItems(model, position) {
    const line = model
      .getLineContent(position.lineNumber)
      .slice(0, position.column - 1);
    const match = /[A-Za-z_][\w.]*$/.exec(line);
    const start = position.column - (match?.[0].length || 0);
    return {
      suggestions: libraries.map((b) => ({
        label: b.name,
        kind: monaco.languages.CompletionItemKind.Function,
        detail: `(${b.parameters.join(", ")}) → ${b.result}`,
        insertText: `${b.name}(${b.parameters.map((p, i) => "${" + (i + 1) + ":" + (p === "string" ? '"text"' : p === "bool" ? "true" : p === "list" ? "items" : "0") + "}").join(", ")})`,
        insertTextRules:
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range: new monaco.Range(
          position.lineNumber,
          start,
          position.lineNumber,
          position.column,
        ),
      })),
    };
  },
});
monaco.editor.defineTheme("chud-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "569CD6" },
    { token: "string", foreground: "CE9178" },
    { token: "number", foreground: "B5CEA8" },
  ],
  colors: {
    "editor.background": "#1E1E1E",
    "editor.foreground": "#DCDCDC",
    "editorLineNumber.foreground": "#858585",
    "editor.lineHighlightBackground": "#282828",
    "editor.selectionBackground": "#264F78",
  },
});

createRoot(document.getElementById("root")!).render(<App />);
