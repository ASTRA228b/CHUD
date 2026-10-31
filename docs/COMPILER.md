# Compiler and runtime

`chudc` is a C++20 frontend. The lexer produces source-spanned tokens; the recursive-descent parser builds an owning AST with precedence climbing for expressions. Syntax recovery synchronizes at function declarations. Whole-project function collection precedes body checking; scoped binding resolution and type validation occur while lowering typed operations to LLVM IR. IR is discarded if semantic analysis fails.

The driver writes `.ll`, compiles it to `.obj` with LLVM, then links the object and `runtime/src/core.c`, `libraries.c`, and `gui.c` into a Windows x64 executable, with Windows User32/GDI32 system libraries. The runtime C files are support code; the user's CHUD program itself is emitted as LLVM IR. `--release` requests `-O2`; default requests `-O0`. LLVM performs optimization and machine-code generation. Each invocation rebuilds; caching and parallel compilation are future work.

```powershell
chudc Program.chud -o build/Program.exe
chudc Program.chud --check
chudc Program.chud --emit-ir -o build/Program.exe
chudc Program.chud --check --diagnostics-json
chudc Helpers.chud --check --library
chudc Program.chud --symbols-json
```

`--library` permits checking without an entry point, not emitting a static library. JSON diagnostic fields are file, line, column, length and message. `--symbols-json` returns function signatures/positions from the shared AST, excluding an implicit Main. It is intended for tooling. Normal diagnostic output goes to stderr. Native process exit statuses propagate through the driver and build CLI. Arguments are passed without invoking a shell.

Runtime ABI: CHUD int maps to LLVM i32; bool maps to i1 in CHUD functions and widens to C int for all native calls. Native bool results are converted from i32 to i1. Strings map to pointers to UTF-8 NUL-terminated static or runtime-owned text; `list` maps to an opaque runtime-owned pointer. Console calls are `chud_print_string`, `chud_print_int` and `chud_print_bool`. CHUD.Print writes stdout; CHUD.Warn and CHUD.Error write stderr. They each print one newline. `chud_streq`, `chud_div` and `chud_mod` provide defined equality and checked division. The builtin catalog supplies the type signatures used for native calls. These internal ABI names are not public language functions.

The runtime is linked into generated executables, which use the Windows C runtime. They do not require Studio, Node or .NET. The compiler currently locates runtime sources from its configured checkout path; relocatable SDK packaging is not implemented.

## Project files

`chud.toml` is parsed by a TOML library. The project section requires name, semantic version, executable type and an entry under `src/`. All regular `.chud` / `.CHUD` files under src are compiled, skipping symbolic links. Dependencies are rejected until package support exists. The only manifest target is windows-x64. Intermediate and final files go under `.chud/debug/` or `.chud/release/`. `clean` removes only that project's `.chud` directory after path/link checks.

`chud test` compiles each `tests/**/*.chud` file as its own executable, requiring its own Main. Zero indicates success. It fails if no test programs exist. No attribute-based test framework or library fixtures are implemented.

## Troubleshooting

- Compiler not found: build the repository, or configure a compiler path in Studio / CHUD_COMPILER for CLI tooling.
- LLVM not found: set CHUD_CLANG to clang.exe or use the optional local bootstrap.
- Linker/Windows headers missing: install the C++ workload and Windows SDK through Visual Studio Installer.
- Unsupported syntax/type: consult LANGUAGE.md for the actual implemented subset.
- Check/Build sees multiple Main functions: keep one entry point across src; top-level statements create an implicit Main.
- A build failure returns a nonzero status and must not be treated as a successful rebuild, even if an older executable exists on disk.
