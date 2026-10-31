import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Message, Settings } from "./types";
import BasicAssistant from "./BasicAssistant";

const names = {
  code: "ChudGPT-Code",
  plato: "ChudGPT-Plato",
  "plato-mini": "ChudGPT-Plato-Mini",
  public: "ChudGPT-Public",
};
function AIChat({
  settings,
  file,
  content,
  selection,
  errors,
  review,
}: {
  settings: Settings;
  file: string;
  content: string;
  selection: () => string;
  errors: string;
  review: (code: string) => void;
}) {
  const [model, setModel] = useState(settings.assistantModel);
  const [conversations, setConversations] = useState<Record<string, Message[]>>(
    {},
  );
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState("none");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const messages = conversations[model] || [];
  const update = (items: Message[]) =>
    setConversations((c) => ({ ...c, [model]: items }));
  const chat = async (regenerate = false) => {
    const context =
      attachment === "file"
        ? content
        : attachment === "selection"
          ? selection()
          : attachment === "errors"
            ? errors
            : "";
    if (context.length > 3000) {
      setError(
        "Attached context exceeds 3,000 characters. Select a smaller section.",
      );
      return;
    }
    const list = regenerate
      ? messages.slice(0, -1)
      : [...messages, { role: "user" as const, content: input.trim() }];
    if (!list.length || list.at(-1)?.role !== "user" || !list.at(-1)?.content)
      return;
    setError("");
    setBusy(true);
    update(list);
    if (!regenerate) setInput("");
    try {
      const reply = await window.chud.assistantChat({
        modelId: model,
        messages: list,
        context,
      });
      update([...list, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ai-chat">
      <div className="panel-heading">
        <span className="sparkle">✦</span>
        <strong>ChudGPT</strong>
        <span className="badge">ASSISTANT</span>
      </div>
      <div className="assistant-controls">
        <select
          aria-label="ChudGPT model"
          value={model}
          disabled={busy}
          onChange={(e) => {
            setModel(e.target.value);
            setError("");
            setStatus("");
          }}
        >
          {Object.entries(names).map(([id, name]) => (
            <option value={id} key={id}>
              {name}
            </option>
          ))}
        </select>
        <button
          disabled={busy}
          title="Check model endpoint"
          onClick={async () => {
            try {
              setStatus((await window.chud.assistantStatus(model)).message);
            } catch (e) {
              setStatus(String(e));
            }
          }}
        >
          ↻
        </button>
      </div>
      {status && <p className="hint status-note">{status}</p>}
      <div className="messages">
        {!messages.length && (
          <div className="assistant-welcome">
            <span className="assistant-glyph">✦</span>
            <h3>A second pair of eyes.</h3>
            <p>
              Ask about CHUD, explain a compiler error, or review a code change.
            </p>
            <button onClick={() => setInput("Explain this CHUD code.")}>
              Explain code
            </button>
            <button
              onClick={() => {
                setInput("Explain these compiler diagnostics.");
                setAttachment("errors");
              }}
            >
              Explain diagnostics
            </button>
            <p className="hint">
              Choose context below before sending. Experimental models may make
              mistakes.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <article className={`message ${m.role}`} key={i}>
            <span className="eyebrow">
              {m.role === "user" ? "YOU" : names[model as keyof typeof names]}
            </span>
            <ReactMarkdown
              components={{
                code({ className, children, ...props }) {
                  const code = String(children).replace(/\n$/, "");
                  return className || code.includes("\n") ? (
                    <span className="code-snippet">
                      <code className={className} {...props}>
                        {children}
                      </code>
                      <span className="code-actions">
                        <button
                          onClick={() => navigator.clipboard.writeText(code)}
                        >
                          Copy code
                        </button>
                        <button disabled={!file} onClick={() => review(code)}>
                          Review replacement
                        </button>
                      </span>
                    </span>
                  ) : (
                    <code {...props}>{children}</code>
                  );
                },
              }}
            >
              {m.content}
            </ReactMarkdown>
          </article>
        ))}
        {busy && (
          <p className="hint">
            Waiting for {names[model as keyof typeof names]}…
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="chat-compose">
        <label className="context-label">
          Share context
          <select
            value={attachment}
            disabled={busy}
            onChange={(e) => setAttachment(e.target.value)}
          >
            <option value="none">None</option>
            <option value="file" disabled={!file}>
              Current file: {file.split(/[\\/]/).pop() || "none"}
            </option>
            <option value="selection" disabled={!file}>
              Selected code
            </option>
            <option value="errors">Compiler diagnostics</option>
          </select>
        </label>
        {attachment !== "none" && (
          <p className="hint">
            {attachment === "file"
              ? `${file} · ${content.length} characters`
              : attachment === "errors"
                ? `${errors.length} diagnostic characters`
                : "Only the selected code will be attached when you send."}
          </p>
        )}
        <textarea
          aria-label="Ask ChudGPT"
          placeholder="Ask ChudGPT…"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void chat();
          }}
        />
        <div className="chat-actions">
          <button
            disabled={busy}
            onClick={async () => {
              setError("");
              try {
                await window.chud.assistantClear(model);
                update([]);
              } catch (e) {
                setError(String(e));
              }
            }}
          >
            Clear
          </button>
          <button
            disabled={busy || messages.at(-1)?.role !== "assistant"}
            onClick={() => void chat(true)}
          >
            Regenerate
          </button>
          {busy ? (
            <button onClick={() => void window.chud.assistantCancel()}>
              Stop
            </button>
          ) : (
            <button
              className="primary"
              disabled={!input.trim()}
              onClick={() => void chat()}
            >
              Send ↑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AssistantPanel(
  props: Parameters<typeof AIChat>[0] & {
    newSource: (code: string, filename: string) => Promise<void>;
  },
) {
  const [mode, setMode] = useState<"basic" | "ai">("basic");
  return (
    <aside className="assistant">
      <div
        className="assistant-mode"
        role="tablist"
        aria-label="Assistant mode"
      >
        <button
          role="tab"
          aria-selected={mode === "basic"}
          onClick={() => setMode("basic")}
        >
          Basic assistant
        </button>
        <button
          role="tab"
          aria-selected={mode === "ai"}
          onClick={() => setMode("ai")}
        >
          ChudGPT AI
        </button>
      </div>
      <div hidden={mode !== "basic"} className="assistant-content">
        <BasicAssistant
          file={props.file}
          review={props.review}
          newSource={props.newSource}
        />
      </div>
      <div hidden={mode !== "ai"} className="assistant-content">
        <AIChat {...props} />
      </div>
    </aside>
  );
}
