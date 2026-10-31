import { useState } from "react";
import { starters, starterSource } from "../shared/starters.mjs";
import { libraries } from "./libraries";

export default function BasicAssistant({
  file,
  review,
  newSource,
}: {
  file: string;
  review: (code: string) => void;
  newSource: (code: string, filename: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState("hello");
  const [title, setTitle] = useState("Hello from CHUD!");
  const [tab, setTab] = useState<"starters" | "libraries">("starters");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [filename, setFilename] = useState("src/Starter.chud");
  const starter = starters.find((s) => s.id === selected)!;
  const source = starterSource(selected, title);
  return (
    <div className="basic-assistant">
      <div className="basic-intro">
        <span className="local-badge">LOCAL · NO AI</span>
        <h3>A running start.</h3>
        <p>
          Choose a starter, customize its title, then review the code. No model,
          account or connection needed.
        </p>
      </div>
      <div
        className="assistant-tabs"
        role="tablist"
        aria-label="Basic assistant tools"
      >
        <button
          role="tab"
          aria-selected={tab === "starters"}
          onClick={() => setTab("starters")}
        >
          Starter programs
        </button>
        <button
          role="tab"
          aria-selected={tab === "libraries"}
          onClick={() => setTab("libraries")}
        >
          Library reference
        </button>
      </div>
      {tab === "starters" ? (
        <>
          <label className="basic-field">
            Starter template
            <select
              aria-label="Starter template"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setError("");
              }}
            >
              {starters.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name} · {s.category}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">{starter.description}</p>
          <label className="basic-field">
            Program title or greeting
            <input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <div className="library-chips">
            {starter.libraries.map((name) => (
              <span key={name}>CHUD.{name}</span>
            ))}
          </div>
          <details className="starter-preview" open>
            <summary>
              Source preview · {source.split("\n").length - 1} lines
            </summary>
            <pre aria-label="Starter source preview">{source}</pre>
          </details>
          <div className="basic-actions">
            <button
              onClick={() =>
                navigator.clipboard
                  .writeText(source)
                  .then(() => setError("Copied starter source."))
                  .catch((e) => setError(String(e)))
              }
            >
              Copy source
            </button>
            <button
              className="primary"
              disabled={!/\.chud$/i.test(file)}
              onClick={() => review(source)}
            >
              Review replacement
            </button>
          </div>
          <p className="hint">
            Replacement opens a diff for the active CHUD file. Creating another
            file with Main requires removing or renaming your existing entry
            point before building.
          </p>
          <label className="basic-field">
            New file path
            <input
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="src/Starter.chud"
            />
          </label>
          <button
            disabled={creating || !filename.trim()}
            onClick={async () => {
              setCreating(true);
              setError("");
              try {
                await newSource(source, filename.trim());
                setError("Created starter file.");
              } catch (e) {
                setError(String(e));
              } finally {
                setCreating(false);
              }
            }}
          >
            Create new source file
          </button>
        </>
      ) : (
        <>
          <label className="basic-field">
            Search libraries
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Text, GUI, Collections…"
            />
          </label>
          <p className="hint">
            {libraries.length} native functions. Use fully qualified names.
            Collections hold integers; numeric libraries use 32-bit int.
          </p>
          <div className="library-reference">
            {libraries
              .filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
              .map((b) => (
                <article key={b.name}>
                  <code>{b.name}</code>
                  <small>
                    ({b.parameters.join(", ")}) → {b.result}
                  </small>
                  <button
                    aria-label={`Copy ${b.name}`}
                    onClick={() =>
                      navigator.clipboard
                        .writeText(
                          `${b.name}(${b.parameters.map((type) => (type === "string" ? '"text"' : type === "bool" ? "true" : type === "list" ? "items" : "0")).join(", ")})`,
                        )
                        .catch((e) => setError(String(e)))
                    }
                  >
                    Copy call
                  </button>
                </article>
              ))}
          </div>
        </>
      )}
      {error && (
        <p className="hint basic-message" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
