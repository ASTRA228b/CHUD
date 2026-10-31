import { useCallback, useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import type { Diagnostic, Document, Entry, Presence, State } from "./types";
import SettingsPanel from "./Settings";
import AssistantPanel from "./Assistant";
import logo from "../assets/chud.svg";
import ReviewDiff from "./ReviewDiff";

function Tree({
  entries,
  active,
  open,
}: {
  entries: Entry[];
  active: string;
  open: (path: string) => void;
}) {
  return (
    <>
      {entries.map((e) =>
        e.children ? (
          <details open key={e.path}>
            <summary>
              ⌄ <span>{e.name}</span>
            </summary>
            <div className="tree-indent">
              <Tree entries={e.children} active={active} open={open} />
            </div>
          </details>
        ) : (
          <button
            key={e.path}
            className={`file ${active === e.path ? "selected" : ""}`}
            onClick={() => open(e.path)}
          >
            <span
              className={
                /\.chud$/i.test(e.name) ? "file-icon" : "file-icon dim"
              }
            >
              {/\.chud$/i.test(e.name) ? "C" : "≡"}
            </span>
            {e.name}
          </button>
        ),
      )}
    </>
  );
}
const basename = (s: string) => s.split(/[\\/]/).pop() || s;
export default function App() {
  const [state, setState] = useState<State | null>(null),
    [docs, setDocs] = useState<Document[]>([]),
    [active, setActive] = useState("");
  const [presence, setPresence] = useState<Presence>({
    state: "disabled",
    message: "Discord Rich Presence is off",
  });
  const [settingsOpen, setSettingsOpen] = useState(false),
    [output, setOutput] = useState(
      "CHUD Studio 0.1.0-alpha\nReady. Open a project or start with HelloCHUD.\n",
    );
  const [panel, setPanel] = useState("Output"),
    [terminal, setTerminal] = useState(""),
    [busy, setBusy] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]),
    [notice, setNotice] = useState(""),
    [split, setSplit] = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(true),
    [review, setReview] = useState<string | null>(null);
  const [newProject, setNewProject] = useState(false),
    [projectName, setProjectName] = useState("MyApplication"),
    [empty, setEmpty] = useState(false);
  const [newFile, setNewFile] = useState(false),
    [filename, setFilename] = useState("src/NewFile.chud");
  const [closeDialog, setCloseDialog] = useState(false),
    [search, setSearch] = useState(""),
    [searchOpen, setSearchOpen] = useState(false);
  const editor = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const closeReview = () => {
    setReview(null);
  };
  const [commandsOpen, setCommandsOpen] = useState(false),
    [commandQuery, setCommandQuery] = useState("");
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const commandHandler = useRef<(command: string) => void>(() => {});
  const outputView = useRef<HTMLPreElement | null>(null);
  const monaco = useRef<typeof Monaco | null>(null);
  const docsRef = useRef(docs);
  docsRef.current = docs;
  useEffect(() => {
    if (outputView.current)
      outputView.current.scrollTop = outputView.current.scrollHeight;
  }, [output, panel]);
  const current = docs.find((d) => d.path === active);
  const append = useCallback(
    (text: string) => setOutput((o) => (o + text).slice(-200000)),
    [],
  );
  const fail = (e: unknown) => setNotice(String(e));
  const open = async (relative: string) => {
    try {
      if (!docsRef.current.some((d) => d.path === relative)) {
        const content = await window.chud.readFile(relative);
        setDocs((d) =>
          d.some((x) => x.path === relative)
            ? d
            : [...d, { path: relative, content, saved: content }],
        );
      }
      setActive(relative);
      await window.chud.editorContext(relative);
    } catch (e) {
      fail(e);
    }
  };
  const save = useCallback(
    async (document?: Document) => {
      const d = document || docsRef.current.find((x) => x.path === active);
      if (!d) return;
      await window.chud.saveFile({ relative: d.path, content: d.content });
      setDocs((items) =>
        items.map((x) => (x.path === d.path ? { ...x, saved: d.content } : x)),
      );
    },
    [active],
  );
  const saveAll = async () => {
    for (const d of docsRef.current) if (d.content !== d.saved) await save(d);
  };
  const guardSwitch = () =>
    !docsRef.current.some((d) => d.content !== d.saved) ||
    window.confirm("Discard unsaved files and switch projects?");
  const applyWorkspace = async (s: State | null) => {
    if (!s) return;
    setState(s);
    setDocs([]);
    setActive("");
    setDiagnostics([]);
    setPresence(s.presence);
    setNotice("");
    const entry = s.files
      .find((e) => e.name === "src")
      ?.children?.find((e) => /\.chud$/i.test(e.name));
    if (entry) {
      const content = await window.chud.readFile(entry.path);
      setDocs([{ path: entry.path, content, saved: content }]);
      setActive(entry.path);
    }
  };
  useEffect(() => {
    window.chud
      .state()
      .then((s) => {
        setState(s);
        setPresence(s.presence);
        if (s.warning) setNotice(s.warning);
        const first = s.files
          .find((e) => e.name === "src")
          ?.children?.find((e) => /\.chud$/i.test(e.name));
        if (first) void open(first.path);
      })
      .catch(fail);
    const offOutput = window.chud.onOutput(append),
      offPresence = window.chud.onPresence(setPresence);
    const offClose = window.chud.onCloseRequest(() => {
      if (docsRef.current.some((d) => d.content !== d.saved))
        setCloseDialog(true);
      else void window.chud.confirmClose(true);
    });
    const offCommand = window.chud.onCommand((command) =>
      commandHandler.current(command),
    );
    return () => {
      offOutput();
      offPresence();
      offClose();
      offCommand();
    };
  }, [append]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save().catch(fail);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [save]);
  useEffect(() => {
    if (
      !state?.settings.autosave ||
      !current ||
      current.content === current.saved
    )
      return;
    const timer = setTimeout(() => {
      void save(current).catch(fail);
    }, 1000);
    return () => clearTimeout(timer);
  }, [current?.content, current?.saved, state?.settings.autosave, save]);
  useEffect(() => {
    if (!current || !/\.chud$/i.test(current.path)) {
      setDiagnostics([]);
      return;
    }
    let valid = true;
    const timer = setTimeout(() => {
      window.chud
        .diagnostics({ relative: current.path, content: current.content })
        .then((ds) => {
          if (!valid) return;
          setDiagnostics(ds);
          const model = editor.current?.getModel();
          if (model && monaco.current)
            monaco.current.editor.setModelMarkers(
              model,
              "chud",
              ds.map((d) => ({
                startLineNumber: d.line,
                startColumn: d.column,
                endLineNumber: d.line,
                endColumn: d.column + Math.max(d.length, 1),
                severity: monaco.current!.MarkerSeverity.Error,
                message: d.message,
              })),
            );
        })
        .catch((e) => {
          if (valid) setNotice(`Diagnostics: ${String(e)}`);
        });
    }, 500);
    return () => {
      valid = false;
      clearTimeout(timer);
    };
  }, [current?.path, current?.content]);
  const build = async (action: string) => {
    if (!state) return;
    setBusy(true);
    setPanel("Output");
    setNotice("");
    try {
      await saveAll();
      const result = await window.chud.build({
        action,
        configuration: state.settings.configuration,
      });
      setNotice(
        result.code === 0
          ? `${action === "run" ? "Program finished" : "CHUD " + action + " succeeded"}.`
          : `CHUD ${action} failed (exit ${result.code}). See output.`,
      );
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const change = (content: string | undefined) =>
    setDocs((items) =>
      items.map((d) =>
        d.path === active ? { ...d, content: content ?? "" } : d,
      ),
    );
  const commands = [
    {
      id: "newProject",
      name: "File: New project",
      run: () => setNewProject(true),
    },
    {
      id: "newFile",
      name: "File: New source file",
      run: () => setNewFile(true),
    },
    {
      id: "openProject",
      name: "File: Open project",
      run: async () => {
        if (guardSwitch())
          await applyWorkspace(await window.chud.openProject());
      },
    },
    { id: "save", name: "File: Save active file", run: () => save() },
    { id: "saveAll", name: "File: Save all", run: saveAll },
    { id: "findFile", name: "View: Find file", run: () => setSearchOpen(true) },
    {
      id: "split",
      name: "View: Toggle split editor",
      run: () => setSplit((s) => !s),
    },
    {
      id: "assistant",
      name: "View: Toggle assistant",
      run: () => setAssistantVisible((s) => !s),
    },
    ...["Output", "Problems", "Terminal"].map((name) => ({
      id: name.toLowerCase(),
      name: `View: ${name === "Problems" ? "Error List" : name}`,
      run: () => setPanel(name),
    })),
    ...["check", "build", "run"].map((action) => ({
      id: action,
      name: `Build: ${action[0].toUpperCase() + action.slice(1)} project`,
      run: () => {
        if (!busy) return build(action);
      },
    })),
    {
      id: "stop",
      name: "Build: Stop running process",
      run: () => window.chud.stop(),
    },
    {
      id: "settings",
      name: "Tools: Studio settings",
      run: () => setSettingsOpen(true),
    },
  ];
  commandHandler.current = (id) => {
    if (id === "commands") {
      setCommandQuery("");
      setCommandsOpen(true);
      return;
    }
    const command = commands.find((c) => c.id === id);
    if (command) Promise.resolve(command.run()).catch(fail);
  };
  const options: Monaco.editor.IStandaloneEditorConstructionOptions = {
    fontFamily: "'Cascadia Code', 'Consolas', monospace",
    fontSize: state?.settings.fontSize || 14,
    tabSize: state?.settings.tabSize || 4,
    wordWrap: state?.settings.wordWrap ? "on" : "off",
    minimap: { enabled: false },
    padding: { top: 20 },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    bracketPairColorization: { enabled: true },
  };
  if (!state)
    return <main className="loading">{notice || "Opening CHUD Studio…"}</main>;
  const filtered = (entries: Entry[]): Entry[] =>
    entries.flatMap((e) =>
      e.children
        ? [{ ...e, children: filtered(e.children) }]
        : e.path.toLowerCase().includes(search.toLowerCase())
          ? [e]
          : [],
    );
  return (
    <div className={`studio ${assistantVisible ? "" : "assistant-hidden"}`}>
      <header className="titlebar">
        <img src={logo} alt="" />
        <strong>
          CHUD <span>STUDIO</span>
        </strong>
        <span className="title-divider" />
        <button
          onClick={async () => {
            if (!guardSwitch()) return;
            try {
              await applyWorkspace(await window.chud.openProject());
            } catch (e) {
              fail(e);
            }
          }}
        >
          Open project
        </button>
        <button onClick={() => setNewProject(true)}>New project</button>
        <button disabled={!current} onClick={() => void save().catch(fail)}>
          Save <kbd>Ctrl S</kbd>
        </button>
        <span className="project-title">{state.projectName}</span>
        <button
          className="studio-search"
          onClick={() => {
            setCommandQuery("");
            setCommandsOpen(true);
          }}
        >
          ⌕ Search Studio <kbd>Ctrl Q</kbd>
        </button>
        <button
          className="icon-button"
          onClick={() => setSettingsOpen(true)}
          title="Settings (Ctrl+,)"
        >
          ⚙
        </button>
      </header>
      <nav className="activity-bar">
        <button
          title="Explorer"
          className={!searchOpen ? "active" : ""}
          onClick={() => setSearchOpen(false)}
        >
          ▤
        </button>
        <button
          title="Find a file"
          className={searchOpen ? "active" : ""}
          onClick={() => setSearchOpen(true)}
        >
          ⌕
        </button>
        <button title="Split editor" onClick={() => setSplit((s) => !s)}>
          ◫
        </button>
        <div className="spacer" />
        <button
          title="Toggle assistant"
          className={assistantVisible ? "active" : ""}
          onClick={() => setAssistantVisible((x) => !x)}
        >
          ✦
        </button>
        <button title="Settings" onClick={() => setSettingsOpen(true)}>
          ⚙
        </button>
      </nav>
      <aside className="explorer">
        <div className="panel-heading">
          <span>{searchOpen ? "FIND FILE" : "SOLUTION EXPLORER"}</span>
          <button title="New source file" onClick={() => setNewFile(true)}>
            ＋
          </button>
          <button
            title="Refresh files"
            onClick={() =>
              window.chud
                .files()
                .then((files) => setState((s) => s && { ...s, files }))
                .catch(fail)
            }
          >
            ↻
          </button>
        </div>
        {searchOpen && (
          <input
            className="file-search"
            placeholder="Find by filename…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <div className="workspace-name">
          ⌄ {state.projectName.toUpperCase()}
        </div>
        <Tree
          entries={searchOpen ? filtered(state.files) : state.files}
          active={active}
          open={(p) => void open(p)}
        />
        <div className="explorer-bottom">
          <span className="eyebrow">CHUD COMPILER</span>
          <p>0.1.0-alpha</p>
          <span className="hint">Native · Windows x64</span>
        </div>
      </aside>
      <main className="editor-area">
        <div className="buildbar">
          <span className="breadcrumb">
            {state.projectName} <span>/</span> {active.replace(/\\/g, " / ")}
          </span>
          <select
            aria-label="Build configuration"
            disabled={busy}
            value={state.settings.configuration}
            onChange={async (e) => {
              try {
                const settings = await window.chud.saveSettings({
                  ...state.settings,
                  configuration: e.target.value as "debug" | "release",
                });
                setState({ ...state, settings });
              } catch (err) {
                fail(err);
              }
            }}
          >
            <option value="debug">Debug</option>
            <option value="release">Release</option>
          </select>
          <button disabled={busy} onClick={() => void build("check")}>
            Check
          </button>
          <button disabled={busy} onClick={() => void build("build")}>
            Build
          </button>
          <button
            className="primary run"
            disabled={busy}
            onClick={() => void build("run")}
          >
            ▶ Run
          </button>
          <button disabled={!busy} onClick={() => void window.chud.stop()}>
            ■
          </button>
        </div>
        <div className="tabs">
          {docs.map((d) => (
            <div
              className={`tab ${d.path === active ? "active" : ""}`}
              key={d.path}
            >
              <button
                onClick={() => {
                  setActive(d.path);
                  void window.chud.editorContext(d.path);
                }}
              >
                <span className="file-icon">C</span>
                {basename(d.path)}
                {d.content !== d.saved && (
                  <span className="unsaved" aria-label="Unsaved changes">
                    ●
                  </span>
                )}
              </button>
              <button
                aria-label={`Close ${basename(d.path)}`}
                onClick={() => {
                  if (
                    d.content !== d.saved &&
                    !window.confirm(`Discard changes to ${basename(d.path)}?`)
                  )
                    return;
                  const remaining = docs.filter((x) => x.path !== d.path);
                  setDocs(remaining);
                  if (active === d.path) {
                    const next = remaining.at(-1)?.path || "";
                    setActive(next);
                    void window.chud.editorContext(next);
                  }
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className={`editors ${split ? "split" : ""}`}>
          {current ? (
            <>
              <Editor
                path={current.path}
                language={/\.chud$/i.test(active) ? "chud" : "plaintext"}
                theme="chud-dark"
                value={current.content}
                onChange={change}
                options={options}
                onMount={(e, m) => {
                  editor.current = e;
                  monaco.current = m;
                  e.onDidChangeCursorPosition((event) =>
                    setCursor({
                      line: event.position.lineNumber,
                      column: event.position.column,
                    }),
                  );
                }}
              />
              {split && (
                <Editor
                  path={`split:${current.path}`}
                  language="chud"
                  theme="chud-dark"
                  value={current.content}
                  onChange={change}
                  options={options}
                />
              )}
            </>
          ) : (
            <div className="editor-empty">
              <img src={logo} alt="CHUD" />
              <h2>Your next idea starts here.</h2>
              <p>Open a source file from the explorer.</p>
            </div>
          )}
        </div>
        <section className="bottom-panel">
          <div className="bottom-tabs">
            {["Output", "Problems", "Terminal"].map((p) => (
              <button
                className={panel === p ? "active" : ""}
                key={p}
                onClick={() => setPanel(p)}
              >
                {p}
                {p === "Problems" && (
                  <span className="count">{diagnostics.length}</span>
                )}
              </button>
            ))}
            <div className="spacer" />
            <button onClick={() => setOutput("")}>Clear output</button>
          </div>
          {panel === "Problems" ? (
            <div className="problems">
              {diagnostics.length ? (
                diagnostics.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      editor.current?.revealLineInCenter(d.line);
                      editor.current?.setPosition({
                        lineNumber: d.line,
                        column: d.column,
                      });
                      editor.current?.focus();
                    }}
                  >
                    <span className="error">×</span>
                    {d.message}
                    <span className="hint">
                      {basename(d.file)}:{d.line}:{d.column}
                    </span>
                  </button>
                ))
              ) : (
                <p className="hint">
                  No diagnostics in the active file. Check the project for
                  cross-file validation.
                </p>
              )}
            </div>
          ) : (
            <pre
              ref={outputView}
              className="output"
              aria-label="Process output"
            >
              {output}
            </pre>
          )}
          {panel === "Terminal" && (
            <form
              className="terminal-input"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!terminal.trim() || busy) return;
                const command = terminal;
                setTerminal("");
                setBusy(true);
                try {
                  await window.chud.terminal(command);
                } catch (err) {
                  fail(err);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <span>PS ›</span>
              <input
                aria-label="PowerShell command"
                placeholder="Enter a PowerShell command…"
                disabled={busy}
                value={terminal}
                onChange={(e) => setTerminal(e.target.value)}
              />
              <button disabled={busy || !terminal.trim()}>Execute</button>
            </form>
          )}
        </section>
      </main>
      {assistantVisible && (
        <AssistantPanel
          settings={state.settings}
          file={active}
          content={current?.content || ""}
          errors={diagnostics
            .map((d) => `${d.file}:${d.line}: ${d.message}`)
            .join("\n")}
          selection={() => {
            const e = editor.current;
            return e?.getModel()?.getValueInRange(e.getSelection()!) || "";
          }}
          review={(code) => setReview(code)}
          newSource={async (code, relative) => {
            if (!/\.chud$/i.test(relative))
              throw new Error("Choose a .chud file path.");
            const files = await window.chud.newFile(relative);
            await window.chud.saveFile({ relative, content: code });
            setState((s) => s && { ...s, files });
            setDocs((items) => [
              ...items,
              { path: relative, content: code, saved: code },
            ]);
            setActive(relative);
            await window.chud.editorContext(relative);
          }}
        />
      )}
      <footer className="statusbar">
        <span className="branch-indicator">CHUD</span>
        <span>{busy ? "● Working…" : "✓ Ready"}</span>
        <span>× {diagnostics.length}</span>
        <span className="notice" role="status">
          {notice}
        </span>
        <button onClick={() => setSettingsOpen(true)} title={presence.message}>
          <span className={`dot ${presence.state}`} />
          {presence.state === "connected"
            ? "Discord connected"
            : "Discord " +
              (state.settings.discord.enabled ? presence.state : "off")}
        </button>
        <span>UTF-8</span>
        <span>
          Ln {cursor.line}, Col {cursor.column}
        </span>
        <span>{/\.chud$/i.test(active) ? "CHUD" : "Text"}</span>
        <span>0.1.0-alpha</span>
      </footer>
      {commandsOpen && (
        <div className="modal-backdrop" onClick={() => setCommandsOpen(false)}>
          <section
            className="modal command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Search Studio commands"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <h3>Search Studio</h3>
              <button
                aria-label="Close command search"
                onClick={() => setCommandsOpen(false)}
              >
                ×
              </button>
            </header>
            <input
              autoFocus
              aria-label="Search commands"
              placeholder="Search commands…"
              value={commandQuery}
              onChange={(e) => setCommandQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setCommandsOpen(false);
                if (e.key === "Enter") {
                  const match = commands.find((c) =>
                    c.name.toLowerCase().includes(commandQuery.toLowerCase()),
                  );
                  if (match) {
                    setCommandsOpen(false);
                    commandHandler.current(match.id);
                  }
                }
              }}
            />
            <div className="command-results">
              {commands
                .filter((c) =>
                  c.name.toLowerCase().includes(commandQuery.toLowerCase()),
                )
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setCommandsOpen(false);
                      commandHandler.current(c.id);
                    }}
                  >
                    {c.name}
                    <span>↵</span>
                  </button>
                ))}
            </div>
          </section>
        </div>
      )}
      {settingsOpen && (
        <SettingsPanel
          value={state.settings}
          presence={presence}
          close={() => setSettingsOpen(false)}
          save={async (settings) => {
            const saved = await window.chud.saveSettings(settings);
            setState({ ...state, settings: saved });
          }}
        />
      )}
      {review !== null && current && (
        <div className="modal-backdrop">
          <section className="modal diff-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span className="eyebrow">PROPOSED CHANGE</span>
                <h2>Review replacement · {basename(active)}</h2>
              </div>
              <button onClick={closeReview}>✕</button>
            </header>
            <p className="hint">
              Review every change. Applying updates your editor buffer; save
              when ready.
            </p>
            <div className="diff-editor">
              <ReviewDiff original={current.content} modified={review} />
            </div>
            <footer>
              <button onClick={closeReview}>Reject</button>
              <button
                className="primary"
                onClick={() => {
                  change(review);
                  closeReview();
                }}
              >
                Approve and apply
              </button>
            </footer>
          </section>
        </div>
      )}
      {newProject && (
        <div className="modal-backdrop">
          <form
            className="modal small-modal"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!guardSwitch()) return;
              try {
                const s = await window.chud.createProject({
                  name: projectName,
                  empty,
                });
                await applyWorkspace(s);
                if (s) setNewProject(false);
              } catch (err) {
                fail(err);
              }
            }}
          >
            <h2>New CHUD project</h2>
            <label>
              Project name
              <input
                autoFocus
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </label>
            <label>
              Template
              <select
                value={empty ? "empty" : "console"}
                onChange={(e) => setEmpty(e.target.value === "empty")}
              >
                <option value="console">Console application</option>
                <option value="empty">Empty application</option>
              </select>
            </label>
            <p className="hint">
              Choose a parent folder next. Existing folders are never
              overwritten.
            </p>
            <p className="error">{notice}</p>
            <footer>
              <button type="button" onClick={() => setNewProject(false)}>
                Cancel
              </button>
              <button className="primary">Choose folder and create</button>
            </footer>
          </form>
        </div>
      )}
      {newFile && (
        <div className="modal-backdrop">
          <form
            className="modal small-modal"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const files = await window.chud.newFile(filename);
                setState({ ...state, files });
                setNewFile(false);
                await open(filename);
              } catch (err) {
                fail(err);
              }
            }}
          >
            <h2>New source file</h2>
            <label>
              Path in project
              <input
                autoFocus
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
              />
            </label>
            <p className="hint">Use an existing folder, such as src/.</p>
            <p className="error">{notice}</p>
            <footer>
              <button type="button" onClick={() => setNewFile(false)}>
                Cancel
              </button>
              <button className="primary">Create file</button>
            </footer>
          </form>
        </div>
      )}
      {closeDialog && (
        <div className="modal-backdrop">
          <section className="modal small-modal" role="dialog">
            <h2>Save your changes?</h2>
            <p>There are unsaved files in this workspace.</p>
            <footer>
              <button onClick={() => setCloseDialog(false)}>Cancel</button>
              <button onClick={() => void window.chud.confirmClose(true)}>
                Discard and close
              </button>
              <button
                className="primary"
                onClick={async () => {
                  try {
                    await saveAll();
                    await window.chud.confirmClose(true);
                  } catch (e) {
                    fail(e);
                  }
                }}
              >
                Save and close
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
