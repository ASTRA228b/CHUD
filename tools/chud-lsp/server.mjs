#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { compilerPath } from "../chud/project.mjs";
import { libraryFunctions } from "../chud/libraries.mjs";

const documents = new Map();
let input = Buffer.alloc(0),
  shutdown = false;
function send(message) {
  const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...message }));
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n`);
  process.stdout.write(body);
}
function offset(text, position) {
  let p = 0;
  for (let line = 0; line < position.line && p < text.length; ++line) {
    const next = text.indexOf("\n", p);
    p = next < 0 ? text.length : next + 1;
  }
  const end = text.indexOf("\n", p);
  return Math.min(end < 0 ? text.length : end, p + position.character);
}
async function compile(text, args) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "chud-lsp-"));
  try {
    const file = path.join(directory, "Document.chud");
    await fs.writeFile(file, text, "utf8");
    return await new Promise((resolve, reject) => {
      const child = spawn(compilerPath(), [file, ...args], {
        windowsHide: true,
      });
      let stdout = "",
        stderr = "";
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("Compiler timed out"));
      }, 10000);
      child.stdout.on("data", (b) => (stdout += b));
      child.stderr.on("data", (b) => (stderr += b));
      child.on("error", (e) => {
        clearTimeout(timer);
        reject(e);
      });
      child.on("close", () => {
        clearTimeout(timer);
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(stderr || "Invalid compiler output"));
        }
      });
    });
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
async function diagnose(uri, document) {
  try {
    const diagnostics = await compile(document.text, [
      "--check",
      "--library",
      "--diagnostics-json",
    ]);
    if (documents.get(uri) !== document) return;
    send({
      method: "textDocument/publishDiagnostics",
      params: {
        uri,
        version: document.version,
        diagnostics: diagnostics.map((d) => ({
          range: {
            start: { line: d.line - 1, character: d.column - 1 },
            end: {
              line: d.line - 1,
              character: d.column - 1 + Math.max(d.length, 1),
            },
          },
          severity: 1,
          source: "CHUD Compiler",
          message: d.message,
        })),
      },
    });
  } catch (e) {
    if (documents.get(uri) === document)
      send({
        method: "window/logMessage",
        params: { type: 1, message: `CHUD Language Server: ${e.message}` },
      });
  }
}
async function handle(message) {
  const { id, method, params } = message;
  const respond = (result) => send({ id, result });
  if (method === "initialize")
    return respond({
      capabilities: {
        positionEncoding: "utf-16",
        textDocumentSync: 2,
        completionProvider: { triggerCharacters: ["."] },
        documentSymbolProvider: true,
      },
      serverInfo: { name: "CHUD Language Server", version: "0.1.0-alpha" },
    });
  if (method === "shutdown") {
    shutdown = true;
    return respond(null);
  }
  if (method === "exit") process.exit(shutdown ? 0 : 1);
  if (shutdown) {
    if (id !== undefined)
      send({ id, error: { code: -32600, message: "Server is shut down" } });
    return;
  }
  if (method === "textDocument/didOpen") {
    const d = params.textDocument;
    const doc = { text: d.text, version: d.version };
    documents.set(d.uri, doc);
    void diagnose(d.uri, doc);
    return;
  }
  if (method === "textDocument/didChange") {
    const uri = params.textDocument.uri,
      old = documents.get(uri);
    if (!old) return;
    let text = old.text;
    for (const change of params.contentChanges)
      text = change.range
        ? text.slice(0, offset(text, change.range.start)) +
          change.text +
          text.slice(offset(text, change.range.end))
        : change.text;
    const doc = { text, version: params.textDocument.version };
    documents.set(uri, doc);
    void diagnose(uri, doc);
    return;
  }
  if (method === "textDocument/didClose") {
    documents.delete(params.textDocument.uri);
    send({
      method: "textDocument/publishDiagnostics",
      params: { uri: params.textDocument.uri, diagnostics: [] },
    });
    return;
  }
  if (method === "textDocument/completion")
    return respond([
      ...[
        "chud",
        "use",
        "func",
        "public",
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
        "true",
        "false",
      ].map((label) => ({ label, kind: 14 })),
      ...["int", "bool", "string", "void", "list"].map((label) => ({
        label,
        kind: 7,
      })),
      ...libraryFunctions,
      ...["CHUD.Print", "CHUD.Warn", "CHUD.Error"].map((label) => ({
        label,
        kind: 3,
        detail: "(value: int | bool | string) -> void",
      })),
    ]);
  if (method === "textDocument/documentSymbol") {
    const doc = documents.get(params.textDocument.uri);
    if (!doc) return respond([]);
    const symbols = await compile(doc.text, ["--symbols-json"]);
    return respond(
      symbols.map((s) => {
        const range = {
          start: { line: s.line - 1, character: s.column - 1 },
          end: { line: s.line - 1, character: s.column - 1 + s.length },
        };
        return {
          name: s.name,
          detail: `-> ${s.type}`,
          kind: 12,
          range,
          selectionRange: range,
        };
      }),
    );
  }
  if (id !== undefined)
    send({
      id,
      error: { code: -32601, message: `Unsupported method: ${method}` },
    });
}
process.stdin.on("data", (chunk) => {
  input = Buffer.concat([input, chunk]);
  if (input.length > 4 * 1024 * 1024) {
    process.stderr.write("LSP message too large\n");
    process.exit(1);
  }
  while (true) {
    const end = input.indexOf("\r\n\r\n");
    if (end < 0) return;
    const match = /Content-Length:\s*(\d+)/i.exec(
      input.subarray(0, end).toString("ascii"),
    );
    if (!match) {
      process.exitCode = 1;
      process.stdin.destroy();
      return;
    }
    const size = Number(match[1]);
    if (size > 4 * 1024 * 1024) process.exit(1);
    if (input.length < end + 4 + size) return;
    const body = input.subarray(end + 4, end + 4 + size);
    input = input.subarray(end + 4 + size);
    let message;
    try {
      message = JSON.parse(body.toString("utf8"));
    } catch {
      send({ id: null, error: { code: -32700, message: "Invalid JSON" } });
      continue;
    }
    void handle(message).catch((e) => {
      if (message.id !== undefined)
        send({ id: message.id, error: { code: -32603, message: e.message } });
    });
  }
});
