# CHUD Studio

Studio is a development desktop app built from the same repository as the compiler. It runs local Monaco assets without a CDN. Open a folder containing chud.toml or create a console/empty project through New project. It never overwrites an existing project folder. Explorer displays editable text files; New source file supports a relative path in an existing folder. Multiple tabs, unsaved markers, split editing, Ctrl+S, Ctrl+F/Ctrl+H, bracket matching, folding, comment toggling and configured autosave are available through Monaco and the surrounding UI.

Build, Check and Run save open modified buffers before invoking the actual project tool. Run recompiles before execution. Output shows compiler errors and process exit status; Stop terminates the active process tree on Windows. The active-document Problems panel uses the compiler frontend on a temporary copy without saving the buffer. Project Check is authoritative for cross-file calls.

The terminal executes a PowerShell command in the selected workspace and captures real stdout/stderr. Each submission creates a fresh, non-interactive process. Commands requiring an interactive prompt, persistent shell state or full-screen terminal control require a future PTY integration. No AI response is sent to this command entry automatically.

Ctrl+, opens settings. Editor size, indentation, wrapping, autosave, compiler location, build configuration, API URLs/timeout and Discord preferences persist under Electron's user data directory in settings.json. Invalid values fail before writing. A damaged file falls back to defaults with a visible warning.

## Discord

Rich Presence defaults off. Enable it only after entering a valid Discord application ID. A bot token is neither accepted nor required. A running Discord desktop client receives activity through local IPC using the documented handshake and SET_ACTIVITY messages. The client probes ten pipes, handles fragmented frames and pings, waits for acknowledgement, throttles changes and retries if Discord closes. Connection state appears in settings and the status bar.

Sharing project and active filename defaults off. Enable either individually. Full paths and source content never enter presence payloads. Elapsed time is the current Studio session. Turning presence off or exiting sends null activity and closes the connection. The Discord account's own activity-privacy settings determine whether others can see it. Application assets are not bundled into Discord; an application icon can be configured in the Developer Portal.

## Safety and current scope

The renderer is sandboxed with context isolation, no Node access, a restrictive CSP and a fixed IPC allowlist. File operations resolve real paths inside the selected project and limit content size. Navigation, popup windows and permission prompts are denied. ChudGPT replies render as text/Markdown. Review replacement opens a diff; Approve and apply changes the editor buffer, and saving is a separate action unless autosave is enabled. This currently replaces a whole active file, not an arbitrary multi-file patch.

Editor panes are toggleable; the bottom panel can be resized. Full rearrangeable layouts, layout persistence, source control, persistent terminal sessions, source-level debugging and a standalone installer are future work.

The standalone `chud-lsp.exe` speaks Content-Length-framed JSON-RPC over stdio. It shares the compiler frontend for diagnostics and function symbols. It supports incremental UTF-16 text updates and static completion for the implemented keywords/builtins. It checks one document at a time. Go to definition, references, rename, signatures, hover, formatting and code actions are not advertised as supported. Studio currently invokes compiler diagnostics directly rather than using that LSP transport.
