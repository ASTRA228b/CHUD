const { randomUUID } = require("node:crypto");
const models = [
  { id: "code", name: "ChudGPT-Code", family: "main" },
  { id: "plato", name: "ChudGPT-Plato", family: "plato" },
  { id: "plato-mini", name: "ChudGPT-Plato-Mini", family: "plato" },
  { id: "public", name: "ChudGPT-Public", family: "public" },
];
class Assistant {
  constructor(fetchImpl = fetch) {
    this.fetch = fetchImpl;
    this.controllers = new Set();
    this.sessions = new Map();
  }
  endpoint(modelId, settings) {
    const model = models.find((m) => m.id === modelId);
    if (!model) throw new Error("Unknown ChudGPT model");
    const base =
      model.family === "public" ? settings.publicBaseUrl : settings.mainBaseUrl;
    return {
      model,
      url: `${base}/api/${model.family === "plato" ? "plato/" : ""}models/${model.id}`,
    };
  }
  cancel() {
    for (const c of this.controllers) c.abort();
    this.controllers.clear();
  }
  async request(url, options, timeout) {
    const controller = new AbortController();
    this.controllers.add(controller);
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await this.fetch(url, {
        ...options,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`ChudGPT returned HTTP ${res.status}`);
      if (!(res.headers.get("content-type") || "").includes("application/json"))
        throw new Error("ChudGPT returned a non-JSON response");
      const text = await res.text();
      if (text.length > 1000000)
        throw new Error("ChudGPT response is too large");
      return JSON.parse(text);
    } catch (e) {
      if (e.name === "AbortError")
        throw new Error("ChudGPT request cancelled or timed out");
      throw e;
    } finally {
      clearTimeout(timer);
      this.controllers.delete(controller);
    }
  }
  async status(modelId, settings) {
    const { url } = this.endpoint(modelId, settings);
    const data = await this.request(
      url,
      {},
      Math.min(settings.requestTimeout, 15000),
    );
    return {
      message:
        "Model endpoint responded. Inference availability is confirmed only by a successful reply.",
      data: JSON.stringify(data).slice(0, 4000),
    };
  }
  async chat({ modelId, messages, context = "" }, settings) {
    const { model, url } = this.endpoint(modelId, settings);
    if (!Array.isArray(messages) || !messages.length || messages.length > 100)
      throw new Error("Invalid chat messages");
    if (typeof context !== "string" || context.length > 3000)
      throw new Error("Attached context is limited to 3,000 characters");
    const clean = messages.map((m) => {
      if (
        !m ||
        !["user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" ||
        m.content.length > 12000
      )
        throw new Error("Invalid chat message");
      return { role: m.role, content: m.content };
    });
    if (clean.at(-1).role !== "user" || !clean.at(-1).content.trim())
      throw new Error("Enter a message first");
    if (context)
      clean.at(-1).content += `\n\nAttached context (CHUD):\n${context}`;
    if (clean.at(-1).content.length > 4000)
      throw new Error(
        "Message and attached context exceed the API’s 4,000 character limit",
      );
    let body;
    if (model.family === "plato") {
      const bounded = clean.slice(-12);
      while (
        bounded.length > 1 &&
        bounded.reduce((n, m) => n + m.content.length, 0) > 4000
      )
        bounded.shift();
      body = { messages: bounded, max_new_tokens: 128 };
    } else {
      if (!this.sessions.has(modelId))
        this.sessions.set(modelId, `chud_studio_${randomUUID()}`);
      body = {
        message: clean.at(-1).content,
        session_id: this.sessions.get(modelId),
      };
    }
    const data = await this.request(
      `${url}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      settings.requestTimeout,
    );
    if (typeof data?.reply !== "string" || !data.reply.trim())
      throw new Error("ChudGPT returned an empty or invalid reply");
    if (data.model !== model.id)
      throw new Error("ChudGPT returned a different model than requested");
    if (model.family === "plato" && data.source !== "neural")
      throw new Error("Invalid Plato response source");
    return data.reply;
  }
  async clear(modelId, settings) {
    const { model, url } = this.endpoint(modelId, settings);
    const session = this.sessions.get(modelId);
    this.sessions.delete(modelId);
    if (model.family !== "plato" && session)
      await this.request(
        `${url}/clear`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: session }),
        },
        settings.requestTimeout,
      );
  }
}
module.exports = { Assistant, models };
