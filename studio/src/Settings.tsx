import { useState } from "react";
import type { Presence, Settings } from "./types";

export default function SettingsPanel({
  value,
  presence,
  save,
  close,
}: {
  value: Settings;
  presence: Presence;
  save: (settings: Settings) => Promise<void>;
  close: () => void;
}) {
  const [draft, setDraft] = useState<Settings>(structuredClone(value));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Settings>(key: K, v: Settings[K]) =>
    setDraft((s) => ({ ...s, [key]: v }));
  const discord = (key: keyof Settings["discord"], v: string | boolean) =>
    setDraft((s) => ({ ...s, discord: { ...s.discord, [key]: v } }));
  return (
    <div className="modal-backdrop">
      <section
        className="settings modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <header>
          <div>
            <span className="eyebrow">MAKE IT YOURS</span>
            <h2 id="settings-title">Studio settings</h2>
          </div>
          <button onClick={close} aria-label="Close settings">
            ✕
          </button>
        </header>
        <div className="settings-body">
          <h3>Editor</h3>
          <div className="form-grid">
            <label>
              Font size
              <input
                type="number"
                min="10"
                max="32"
                value={draft.fontSize}
                onChange={(e) => set("fontSize", Number(e.target.value))}
              />
            </label>
            <label>
              Tab size
              <select
                value={draft.tabSize}
                onChange={(e) => set("tabSize", Number(e.target.value))}
              >
                {[2, 4, 8].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.wordWrap}
              onChange={(e) => set("wordWrap", e.target.checked)}
            />
            Word wrap
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.autosave}
              onChange={(e) => set("autosave", e.target.checked)}
            />
            Autosave after one second
          </label>
          <h3>Build</h3>
          <label>
            CHUD Compiler path
            <input
              value={draft.compilerPath}
              placeholder="Use the bundled development compiler"
              onChange={(e) => set("compilerPath", e.target.value)}
            />
          </label>
          <label>
            Configuration
            <select
              value={draft.configuration}
              onChange={(e) =>
                set(
                  "configuration",
                  e.target.value as Settings["configuration"],
                )
              }
            >
              <option value="debug">Debug</option>
              <option value="release">Release</option>
            </select>
          </label>
          <h3>Discord Rich Presence</h3>
          <div className="setting-toggle">
            <div>
              <strong>Show CHUD Studio on Discord</strong>
              <p>Share your coding activity while Studio is open.</p>
            </div>
            <input
              aria-label="Enable Discord Rich Presence"
              type="checkbox"
              role="switch"
              checked={draft.discord.enabled}
              onChange={(e) => discord("enabled", e.target.checked)}
            />
          </div>
          <label>
            Discord application ID
            <input
              inputMode="numeric"
              placeholder="Application ID from the Discord Developer Portal"
              value={draft.discord.applicationId}
              onChange={(e) => discord("applicationId", e.target.value)}
            />
          </label>
          <p className="hint">
            Create an application named CHUD Studio in the Discord Developer
            Portal and copy its application ID. Discord desktop must be running.
            No bot token or account password is needed.
          </p>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.discord.showProject}
              onChange={(e) => discord("showProject", e.target.checked)}
            />
            Share project name
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.discord.showFile}
              onChange={(e) => discord("showFile", e.target.checked)}
            />
            Share active filename
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={draft.discord.showElapsed}
              onChange={(e) => discord("showElapsed", e.target.checked)}
            />
            Show elapsed session time
          </label>
          <p className="hint">
            Source code and folder paths are never included. Turning this
            setting off clears Studio’s presence.
          </p>
          <div className={`connection ${presence.state}`}>
            <span className="dot" />
            {presence.message}
          </div>
          <h3>ChudGPT</h3>
          <label>
            Main and Plato API base URL
            <input
              value={draft.mainBaseUrl}
              onChange={(e) => set("mainBaseUrl", e.target.value)}
            />
          </label>
          <label>
            Public API base URL
            <input
              value={draft.publicBaseUrl}
              onChange={(e) => set("publicBaseUrl", e.target.value)}
            />
          </label>
          <label>
            Request timeout (seconds)
            <input
              type="number"
              min="5"
              max="180"
              value={draft.requestTimeout / 1000}
              onChange={(e) =>
                set("requestTimeout", Number(e.target.value) * 1000)
              }
            />
          </label>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <span className="hint">Settings are saved on this computer.</span>
          <button onClick={close}>Cancel</button>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await save(draft);
                close();
              } catch (e) {
                setError(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Save settings
          </button>
        </footer>
      </section>
    </div>
  );
}
