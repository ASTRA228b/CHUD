# CHUD architecture

The first milestone implements a C++20 frontend with a lexer, recursive-descent parser, source-spanned AST, scoped symbol resolution and static type checking during LLVM IR lowering. LLVM's command-line backend compiles the IR into an object, then links it with a small C runtime into a native executable. No source-language transpilation or interpreter is involved. Textual LLVM IR keeps the frontend independent of LLVM C++ library versions; embedding those libraries is a future improvement.

`chudc` owns language semantics. The Node-based project CLI and language server invoke it rather than reimplementing a parser. `chud.exe` is a native launcher for the CLI. CHUD Studio is an Electron main process with a sandboxed React/Monaco renderer and a narrow preload API. Build and terminal processes run only in the selected workspace. AI replies are text, never executable commands.

Discord Rich Presence belongs to Studio's main process. Persisted settings control enabling it, the Discord application ID, project and filename visibility, and elapsed time. It defaults off. The local IPC client handles framing, retries, throttling, errors and clearing presence. Neither credentials nor source text are sent to Discord. Protocol reference: https://github.com/discord/discord-rpc/blob/master/documentation/hard-mode.md

Milestone order: native compiler; useful project CLI; actual Studio editing/build/run; Discord settings; compiler-backed LSP diagnostics; verified ChudGPT adapters. Advanced types, packages and native debugging follow after this foundation. No controls should imply those later features are implemented.
