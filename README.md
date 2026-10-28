# CHUD · 0.1.0-alpha

CHUD is a native programming language with a C++20 compiler and its own desktop development environment, **CHUD Studio**. This repository is an initial working milestone of the larger language brief, not a completed ecosystem.

The compiler lexes and parses real `.chud` / `.CHUD` source, checks types and scopes, emits LLVM IR, compiles native object files, and links genuine Windows x64 executables. Generated programs run without Node.js, .NET, or Studio. The development toolchain itself currently requires Node.js and the native build dependencies below.

## What works

- Native compilation of `int`, `bool`, strings, functions, immutable/mutable locals, literal constants, conditionals, ranges, loops, short circuit logic, and console output.
- `chud new`, `build`, `run`, `check`, `test`, and `clean`, including multi-file projects and debug/release optimization choices.
- Studio's local Monaco editor, file explorer, source tabs, split editor, saving/autosave, compiler diagnostics, Build/Run/Stop, command execution through PowerShell, and persisted settings.
- **Settings → Discord Rich Presence**: a simple enable toggle with a built-in CHUD Studio identity, project/filename privacy controls, elapsed time, reconnection and clearing on disable/exit. Defaults off.
- Four ChudGPT model adapters, explicit context attachments, cancellation, per-model conversations, Markdown/code copying, and a diff review before applying a proposed file replacement.
- A small compiler-backed language server with document diagnostics, incremental edits, keyword/builtin completion and function symbols.

## Build on Windows

Requirements: Windows x64; Visual Studio 2022 Desktop development with C++ (including Windows SDK and CMake); Node.js 20.11+ with npm; LLVM 20+ with `clang.exe` available via `PATH`, `CHUD_CLANG`, or `.tools/llvm/bin/clang.exe`.

```powershell
git clone https://github.com/ASTRA228b/CHUD.git
cd CHUD
powershell -ExecutionPolicy Bypass -File scripts/build.ps1
```

If LLVM is missing, the optional bootstrap downloads LLVM 20.1.8 from its official GitHub release, verifies a pinned checksum, and extracts it locally. It requires 7-Zip and does not install LLVM system-wide:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1 -DownloadLLVM
```

Run `CHUD Studio.cmd` after building, or:

```powershell
npm start --prefix studio
```

The native command launchers are in `build/bin`. For this terminal session:

```powershell
$env:Path = "$PWD\build\bin;$env:Path"
chud new MyApplication
cd MyApplication
chud build
chud run
```

Expected application output: `Hello from CHUD!`. Build output is shown only after the compiler and linker return success.

For the supplied sample, run `chud run` inside `examples/HelloWorld`. `examples/HelloWorld/Program.chud` is also a standalone copy of the required first program; the project CLI compiles files under `src/`.

## Discord Rich Presence

Open Studio settings with **Ctrl+,**, enable **Show CHUD Studio on Discord**, and save. Keep Discord desktop running and allow activity sharing in Discord. Studio includes its own registered application identity, so no application ID, bot token, or account setup is required.

Project and filename sharing default off; each can be enabled separately. Only basenames are shared, alongside Editing/Building/Running/Idle and optional session time. Source code, absolute paths and chat contents are excluded. **Advanced Discord options** lets developers optionally use a custom application ID. Existing custom IDs are preserved when upgrading. The automated IPC and UI tests use a local test server and do not post to your Discord account.

## Validation

```powershell
npm test
npm test --prefix studio
npm run build --prefix studio
cd studio
node tests-ui/smoke.mjs
```

Compiler tests inspect real PE headers and run emitted programs, including arithmetic, functions, scopes, loops, short circuiting, runtime failure paths, multi-file compilation and rejected programs. Studio tests exercise settings persistence, real local IPC framing/retries/throttling/clear, model contracts and failures. The Electron UI test uses an isolated temporary profile/project to verify the editor, Discord controls, native Run and PowerShell output.

## Current limits and next steps

Only `int` (32-bit signed), `bool`, UTF-8 string literals and `void` are implemented. Module headers are accepted, but user-module namespaces, package imports, other primitive types, dynamic allocation, structs/classes, traits, generics, Result, collections, async and a debugger are not implemented. No package registry, installer, publish command, formatter or performance claims are provided.

Debug mode currently means unoptimized code; source-level debug metadata and breakpoints are not available. Command execution is a real PowerShell process per submitted command, not a persistent interactive PTY. Studio diagnostics currently check the active document independently; use Check/Build for cross-file validation. The standalone LSP is not yet Studio's transport for editor services. ChudGPT history is held in memory; model mappings follow the documented IDs but endpoint reachability does not prove inference readiness.

Native launchers currently locate resources in the source checkout, so CI artifacts are development artifacts rather than standalone distributions. Next: connect Studio to the LSP as its common language-service transport, improve cross-file diagnostics, introduce module resolution and additional numeric types, then extend the runtime before advanced types and debugging.

Read [Language](docs/LANGUAGE.md), [Compiler and runtime](docs/COMPILER.md), [Studio](docs/STUDIO.md), [ChudGPT](docs/CHUDGPT.md), [Architecture](docs/ARCHITECTURE.md), and [Roadmap](docs/ROADMAP.md).
