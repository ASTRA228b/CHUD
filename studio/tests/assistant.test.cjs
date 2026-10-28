const test = require("node:test");
const assert = require("node:assert/strict");
const { Assistant } = require("../electron/assistant.cjs");
const { defaults } = require("../electron/settings.cjs");
const messages = [{ role: "user", content: "Explain CHUD" }];
test("all four models use the documented family contracts", async () => {
  const calls = [];
  const assistant = new Assistant(async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    const id = url.split("/").at(-2);
    return new Response(
      JSON.stringify({
        reply: "Actual test response",
        model: id,
        source: "neural",
      }),
      { headers: { "content-type": "application/json" } },
    );
  });
  for (const modelId of ["code", "plato", "plato-mini", "public"])
    await assistant.chat({ modelId, messages }, defaults);
  assert.equal(
    calls[0].url,
    "https://chudgpt-xi.vercel.app/api/models/code/chat",
  );
  assert.equal(calls[0].body.message, "Explain CHUD");
  assert.ok(calls[0].body.session_id);
  assert.equal(
    calls[1].url,
    "https://chudgpt-xi.vercel.app/api/plato/models/plato/chat",
  );
  assert.deepEqual(calls[1].body.messages, messages);
  assert.equal(calls[1].body.session_id, undefined);
  assert.match(calls[2].url, /plato-mini\/chat$/);
  assert.match(
    calls[3].url,
    /chudgpt-public.vercel.app\/api\/models\/public\/chat$/,
  );
});
test("offline, empty and incorrect model responses fail without fabricated replies", async () => {
  for (const fetch of [
    async () => new Response("", { status: 503 }),
    async () =>
      new Response("{}", { headers: { "content-type": "application/json" } }),
    async () =>
      new Response(JSON.stringify({ reply: "x", model: "wrong" }), {
        headers: { "content-type": "application/json" },
      }),
  ]) {
    await assert.rejects(
      new Assistant(fetch).chat({ modelId: "code", messages }, defaults),
    );
  }
});
test("cancellation aborts a pending request", async () => {
  const assistant = new Assistant(
    async (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        ),
      ),
  );
  const pending = assistant.chat({ modelId: "code", messages }, defaults);
  assistant.cancel();
  await assert.rejects(pending, /cancelled/);
});
