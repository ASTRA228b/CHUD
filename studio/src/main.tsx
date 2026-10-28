/// <reference types="vite/client" />
import React from "react";
import { createRoot } from "react-dom/client";
import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/editor/edcore.main";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import App from "./App";
import "./style.css";

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
monaco.editor.defineTheme("chud-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "keyword", foreground: "C084FC" },
    { token: "string", foreground: "A5D6B5" },
    { token: "number", foreground: "FBBF24" },
  ],
  colors: {
    "editor.background": "#15151D",
    "editor.foreground": "#F1F1F5",
    "editorLineNumber.foreground": "#555569",
    "editor.lineHighlightBackground": "#1B1B27",
    "editor.selectionBackground": "#8B5CF633",
  },
});

createRoot(document.getElementById("root")!).render(<App />);
