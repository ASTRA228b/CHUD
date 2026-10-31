# CHUD Studio

Studio is a development desktop app built from the same repository as the compiler. It runs local Monaco assets without a CDN. Open a folder containing chud.toml or create a console/empty project through New project. It never overwrites an existing project folder. Explorer displays editable text files; New source file supports a relative path in an existing folder. Multiple tabs, unsaved markers, split editing, Ctrl+S, Ctrl+F/Ctrl+H, bracket matching, folding, comment toggling and configured autosave are available through Monaco and the surrounding UI.

Build, Check and Run save open modified buffers before invoking the actual project tool. Run recompiles before execution. Output shows compiler errors and process exit status; Stop terminates the active process tree on Windows. The active-document Problems panel uses the compiler frontend on a temporary copy without saving the buffer. Project Check is authoritative for cross-file calls.

The terminal executes a PowerShell command in the selected workspace and captures real stdout/stderr. Each submission creates a fresh, non-interactive process. Commands requiring an interactive prompt, persistent shell state or full-screen terminal control require a future PTY integration. No AI response is sent to this command entry automatically.

Ctrl+, opens settings. Editor size, indentation, wrapping, autosave, compiler location, build configuration, API URLs/timeout and Discord preferences persist under Electron's user data directory in settings.json. Invalid values fail before writing. A damaged file falls back to defaults with a visible warning.

## Menus, search and Basic assistant

Studio uses compact dark tool windows, an active-document tab strip, Solution Explorer, a green Run action and purple status bar inspired by Visual Studio 2022. File/Edit/View/Build/Tools are functional native menus. Ctrl+Q opens searchable commands, Ctrl+P finds files, Ctrl+Shift+B builds, Ctrl+F5 runs without a debugger, Shift+F5 stops, and Ctrl+Shift+S saves all. Editor cursor line/column appears in the status bar. A debugger is not supplied.

The assistant pane opens in **Basic assistant**, a local template tool, separate from **ChudGPT AI**. Ten starters cover console, math, text, lists, dice, file IO, a GUI counter/dashboard, game helpers, and timing. Choose a starter and edit its title/greeting; the preview updates deterministically. Copy source, review a replacement for the active CHUD file, or create a new source file. New files are created exclusively and existing paths are rejected. Replacements require approval in the diff, and then a save. Keep only one Main function in a project when creating new starter files.

Basic assistant makes no network/model calls, reads no chat context, and remains available offline. The Library reference tab searches all native signatures and copies calls. Monaco completion and the standalone LSP include the same catalog. The ChudGPT AI tab preserves the existing four model adapters, explicit context choices and reviewed code replacements; basic templates are not fabricated AI responses.

Run `powershell -File scripts/create-shortcut.ps1` from the checkout after building Studio to create/update `CHUD Studio.lnk` on the current user's actual Desktop (including OneDrive redirection). It targets the installed local Electron executable, points it at Studio, and uses the CHUD icon. Moving the checkout requires rerunning the script; this is not an installer.

## Discord Rich Presence

Rich Presence defaults off. Enable **Show CHUD Studio on Discord** and save; the built-in registered identity makes this work without an application ID, bot token, or login. An optional custom ID is available under **Advanced Discord options**. Existing saved custom IDs remain selected during migration. A running Discord desktop client receives activity through local IPC using the documented handshake and SET_ACTIVITY messages. The client probes ten pipes, handles fragmented frames and pings, waits for acknowledgement, throttles changes and retries if Discord closes. Connection state appears in settings and the status bar.

Sharing project and active filename defaults off. Enable either individually. Full paths and source content never enter presence payloads. Elapsed time is the current Studio session. Turning presence off or exiting sends null activity and closes the connection. The Discord account's own activity-privacy settings determine whether others can see it. Application assets are not bundled into Discord; an application icon can be configured in the Developer Portal.

The UI smoke test supplies a local IPC test server using `--chud-test-mode` plus `CHUD_DISCORD_TEST_PIPE`; the override is ignored outside explicit test mode. It verifies enabling with no ID, connection acknowledgement, optional custom-ID validation, and clearing on disable without touching the user's Discord activity.

## Safety and current scope

The renderer is sandboxed with context isolation, no Node access, a restrictive CSP and a fixed IPC allowlist. File operations resolve real paths inside the selected project and limit content size. Navigation, popup windows and permission prompts are denied. ChudGPT replies render as text/Markdown. Review replacement opens a diff; Approve and apply changes the editor buffer, and saving is a separate action unless autosave is enabled. This currently replaces a whole active file, not an arbitrary multi-file patch.

Editor panes are toggleable; the bottom panel can be resized. Full rearrangeable layouts, layout persistence, source control, persistent terminal sessions, source-level debugging and a standalone installer are future work.

The standalone `chud-lsp.exe` speaks Content-Length-framed JSON-RPC over stdio. It shares the compiler frontend for diagnostics and function symbols. It supports incremental UTF-16 text updates and static completion for the implemented keywords/builtins. It checks one document at a time. Go to definition, references, rename, signatures, hover, formatting and code actions are not advertised as supported. Studio currently invokes compiler diagnostics directly rather than using that LSP transport.
