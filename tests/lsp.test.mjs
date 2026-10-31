import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import { root } from "../tools/chud/project.mjs";
test("LSP framing, incremental edits, compiler diagnostics, symbols and shutdown", async () => {
  const child = spawn(
    process.execPath,
    [path.join(root, "tools/chud-lsp/server.mjs")],
    { stdio: ["pipe", "pipe", "pipe"] },
  );
  let buffer = Buffer.alloc(0),
    next = 1;
  const queue = [],
    waiters = [];
  const accept = (message) => {
    const index = waiters.findIndex((w) => w.test(message));
    if (index >= 0) {
      const [w] = waiters.splice(index, 1);
      clearTimeout(w.timer);
      w.resolve(message);
    } else queue.push(message);
  };
  child.stdout.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const end = buffer.indexOf("\r\n\r\n");
      if (end < 0) return;
      const size = Number(
        /Content-Length: (\d+)/i.exec(buffer.subarray(0, end).toString())[1],
      );
      if (buffer.length < end + 4 + size) return;
      accept(JSON.parse(buffer.subarray(end + 4, end + 4 + size).toString()));
      buffer = buffer.subarray(end + 4 + size);
    }
  });
  const wait = (predicate) => {
    const index = queue.findIndex(predicate);
    if (index >= 0) return Promise.resolve(queue.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const entry = {
        test: predicate,
        resolve,
        timer: setTimeout(() => reject(new Error("LSP test timed out")), 10000),
      };
      waiters.push(entry);
    });
  };
  const send = (message) => {
    const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...message }));
    child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    child.stdin.write(body);
  };
  const request = (method, params) => {
    const id = next++;
    send({ id, method, params });
    return wait((m) => m.id === id);
  };
  const uri = "file:///CHUD/Program.chud";
  try {
    const init = await request("initialize", {});
    assert.equal(init.result.capabilities.textDocumentSync, 2);
    send({
      method: "textDocument/didOpen",
      params: {
        textDocument: {
          uri,
          languageId: "chud",
          version: 1,
          text: "public func Main() -> int { return false; }",
        },
      },
    });
    const errors = await wait(
      (m) =>
        m.method === "textDocument/publishDiagnostics" &&
        m.params.version === 1,
    );
    assert.match(errors.params.diagnostics[0].message, /Expected int/);
    const falseColumn = "public func Main() -> int { return false; }".indexOf(
      "false",
    );
    send({
      method: "textDocument/didChange",
      params: {
        textDocument: { uri, version: 2 },
        contentChanges: [
          {
            range: {
              start: { line: 0, character: falseColumn },
              end: { line: 0, character: falseColumn + 5 },
            },
            text: "0",
          },
        ],
      },
    });
    const fixed = await wait(
      (m) =>
        m.method === "textDocument/publishDiagnostics" &&
        m.params.version === 2,
    );
    assert.deepEqual(fixed.params.diagnostics, []);
    const symbols = await request("textDocument/documentSymbol", {
      textDocument: { uri },
    });
    assert.equal(symbols.result[0].name, "Main");
    const completions = await request("textDocument/completion", {
      textDocument: { uri },
      position: { line: 0, character: 0 },
    });
    assert.ok(completions.result.some((c) => c.label === "CHUD.Print"));
    assert.ok(
      completions.result.some((c) => c.label === "CHUD.GUILayout.Button"),
    );
    assert.ok(
      completions.result.some((c) => c.label === "CHUD.Collections.New"),
    );
    const unknown = await request("notSupported", {});
    assert.equal(unknown.error.code, -32601);
    await request("shutdown", null);
    send({ method: "exit" });
    const code = await new Promise((resolve) => child.once("exit", resolve));
    assert.equal(code, 0);
  } finally {
    for (const w of waiters) clearTimeout(w.timer);
    child.kill();
  }
});
