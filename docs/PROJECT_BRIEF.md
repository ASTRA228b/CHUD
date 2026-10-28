# CODEX MASTER PROMPT — BUILD THE CHUD PROGRAMMING LANGUAGE

## PROJECT: CHUD — A NEW NATIVE PROGRAMMING LANGUAGE AND DEVELOPMENT ECOSYSTEM

You are the lead compiler engineer, language designer, IDE developer, and systems architect responsible for building an entirely new programming language named **CHUD**.

This is not a concept demonstration. Build a real, usable software project with functional source code, automated tests, executable builds, and documentation.

The project includes a new compiled programming language, native compiler, standard library, runtime, build system, package manager, language server, debugger integration, professional desktop IDE, and ChudGPT-powered AI assistant.

The entire ecosystem must have its own identity.

Do not make a C# clone.

Do not simply rename C# keywords and standard library functions.

Do not create an interpreter.

Do not transpile CHUD into C#, JavaScript, or Python.

Do not use .NET to execute CHUD programs.

The final goal is for developers to write native CHUD applications using `.chud` source files, compile them into real machine-code executables, and develop them using CHUD Studio.

---

# 1. PROJECT IDENTITY

Project Name: CHUD

Initial Version: 0.1.0-alpha

Source Extension: `.chud`

Also recognize uppercase `.CHUD` extensions.

Compiler: CHUD Compiler

Compiler Executable: `chudc.exe`

Build Tool: `chud.exe`

IDE: CHUD Studio

Language Server: CHUD Language Server

Language Server Executable: `chud-lsp.exe`

Runtime: CHUD Runtime

Standard Library: CHUD Standard Library

Package Manager: CHUD Packages

Package Extension: `.chudpkg`

Project Manifest: `chud.toml`

Core Namespace: `CHUD`

Initial Target: Windows 10/11 x64

Future Targets: Linux x64, Linux ARM64, macOS ARM64, macOS x64

Compiler Implementation: C++20/23

Compiler Backend: LLVM

IDE Implementation: Electron + TypeScript + React + Monaco Editor

Build System: CMake

## Branding principles

CHUD must look and behave like its own development ecosystem.

Everything visible to the developer should use CHUD naming and conventions.

Do not display LLVM, Clang, CMake, Electron, or other internal technologies as if they were CHUD's identity.

These tools can be dependencies internally, but the user-facing interface should consistently refer to CHUD.

Examples:

CHUD Compiler

CHUD Build

CHUD Runtime

CHUD Packages

CHUD Studio

CHUD Debugger

CHUD Documentation

CHUD Project

CHUD Workspace

CHUD Extensions

Do not create trademark or copyright claims that have not been established.

---

# 2. LANGUAGE PHILOSOPHY

CHUD must be:

Native.

Fast.

Modern.

Readable.

Safe by default.

Modular.

Independent.

Object-oriented when useful.

Capable of procedural and functional programming.

Appropriate for applications, utilities, libraries, game-development tools, and future systems programming.

CHUD should be easy for a developer familiar with C-style languages to understand, but it must have its own coherent syntax and programming model.

Do not blindly copy another language's semantics.

Design CHUD deliberately.

## Major language principles

1. Ahead-of-time native compilation.
2. Strong static typing.
3. Predictable execution.
4. Clear allocation and resource-management behavior.
5. Useful compile-time diagnostics.
6. Minimal boilerplate.
7. Explicit mutability where appropriate.
8. Safe memory handling by default.
9. Well-defined error handling.
10. Native interoperability.
11. Cross-platform architecture.
12. First-class development tooling.

Document every major language-design decision.

---

# 3. CHUD SYNTAX

Design and implement a coherent original language grammar.

Use the following as the initial CHUD syntax specification.

Unlike C#, CHUD should use `chud` to declare modules, `use` for imports, `func` for functions, `type` for reference-oriented types, `trait` for contracts, and `impl` for implementations.

## Initial language keywords

```text
chud
use
func
let
mut
const
type
struct
trait
impl
enum
public
private
internal
static
new
self
if
else
for
while
loop
break
continue
return
match
case
default
true
false
null
async
await
defer
unsafe
```

Keywords must have clearly defined semantics.

Do not introduce conflicting or redundant keyword combinations.

## Example 1 — Basic CHUD program

File: `Program.chud`

```rust
chud CHUD.App;

use CHUD.Core;

public func Main() -> int
{
    CHUD.Print("Hello from CHUD!");

    let name = "Astra";
    let version = 1;

    CHUD.Print("Welcome to CHUD!");
    CHUD.Print(name);

    return 0;
}
```

The compiler should recognize a public `Main` entry point.

Also support concise top-level programs in executable projects.

## Example 2 — Variables

```rust
let name = "CHUD";

let version = 1;

mut counter = 0;

counter += 1;

const MAX_USERS = 100;
```

`let` declares an immutable local binding by default.

`mut` declares a mutable local binding.

`const` declares a compile-time constant.

Provide explicit type annotations:

```rust
let version: int = 1;

mut speed: float = 8.5;

let enabled: bool = true;
```

The compiler must infer types when an initializer is supplied and inference is unambiguous.

Reject invalid assignments.

## Example 3 — Functions

```rust
func Add(a: int, b: int) -> int
{
    return a + b;
}

func Greet(name: string) -> void
{
    CHUD.Print(name);
}
```

Support function overloading eventually, using defined and documented resolution rules.

Implement functions, calls, parameters, return types, and local scopes during early milestones.

## Example 4 — Conditionals

```rust
mut speed = 10;

if speed > 5
{
    CHUD.Print("Fast");
}
else
{
    CHUD.Print("Slow");
}
```

## Example 5 — Loops

```rust
for i in 0..10
{
    CHUD.Print(i);
}
```

```rust
mut i = 0;

while i < 10
{
    i += 1;
}
```

```rust
loop
{
    break;
}
```

Define exact range semantics, including whether the upper boundary is exclusive.

## Example 6 — Types

```rust
public type Player
{
    private mut health: int = 100;

    public func Damage(amount: int) -> void
    {
        self.health -= amount;
    }

    public func GetHealth() -> int
    {
        return self.health;
    }
}
```

Class-like types must have well-defined reference semantics, construction behavior, visibility, field initialization, and memory-management rules.

## Example 7 — Structs

```rust
public struct Vector3
{
    public x: float;
    public y: float;
    public z: float;
}
```

Structs are value-oriented types.

Specify copying, assignment, layout, and initialization semantics.

## Example 8 — Traits

```rust
public trait Printable
{
    func Print() -> void;
}

impl Printable for Player
{
    public func Print() -> void
    {
        CHUD.Print("Player");
    }
}
```

Traits should be designed as a distinct CHUD feature, not merely renamed C# interfaces.

Define how methods are dispatched and how implementations are checked.

## Example 9 — Result-based errors

Design a generic `Result<T, E>` system.

Proposed syntax:

```rust
func Divide(a: int, b: int) -> Result<int, string>
{
    if b == 0
    {
        return Err("Division by zero");
    }

    return Ok(a / b);
}
```

Document and implement the behavior of `Ok`, `Err`, and error propagation.

## Example 10 — CHUD collections

Design native CHUD collection types.

```rust
use CHUD.Collections;

mut numbers = CHUD.List<int>();

numbers.Add(10);
numbers.Add(20);
numbers.Add(30);

for number in numbers
{
    CHUD.Print(number);
}
```

All examples are design targets.

Do not claim they are valid, tested language programs until the necessary compiler and runtime functionality actually exists.

---

# 4. TYPE SYSTEM

Implement a static type system.

Initial primitives:

`bool`

`byte`

`short`

`int`

`long`

`uint`

`ulong`

`float`

`double`

`char`

`string`

`void`

Specify exact bit widths, numeric ranges, signedness, conversion behavior, overflow handling, and platform guarantees.

Support:

Type inference.

Explicit annotations.

Compile-time type checking.

Function type checking.

Safe conversions.

Type equality and compatibility.

Scopes and symbol visibility.

Structs and reference types.

Generics.

Nullable values.

Traits.

Pattern matching.

Function types.

Do not implement all advanced types immediately.

Start with primitive and function types, then extend the semantic system.

---

# 5. MEMORY MANAGEMENT

CHUD needs its own clear memory model.

Do not automatically imitate C#, C++, or Rust.

Investigate a practical design that combines memory safety, predictable resource lifetime, ergonomic programming, and native performance.

For the initial implementation, choose an explicitly documented allocation and ownership model.

Use safe abstractions for dynamically allocated objects.

Avoid undefined behavior in safe CHUD programs wherever reasonably possible.

Provide deterministic cleanup for supported resources.

Reserve `unsafe` for explicitly documented low-level operations.

Do not promise a complete borrow checker, garbage collector, or zero-overhead ownership system unless it is actually implemented.

Memory safety is more important than an unverified performance claim.

---

# 6. REAL NATIVE COMPILER

Build a real compiler named `chudc`.

Use the following pipeline:

```text
.chud Source Files
        |
        v
CHUD Lexer
        |
        v
CHUD Parser
        |
        v
CHUD Abstract Syntax Tree
        |
        v
CHUD Symbol Resolution
        |
        v
CHUD Semantic Analysis
        |
        v
CHUD Type Checker
        |
        v
CHUD Intermediate Representation
        |
        v
LLVM IR Generation
        |
        v
LLVM Optimization
        |
        v
Native Object Files
        |
        v
Native Linker
        |
        v
.exe / Native Executable
```

## Compiler requirements

Implement a proper lexer.

Implement a grammar-based parser.

Implement AST nodes with source spans.

Implement syntax-error recovery.

Implement symbol tables.

Implement nested scopes.

Implement module resolution.

Implement type checking.

Implement LLVM IR generation.

Implement native object-file generation.

Implement linking.

Support debug and release builds.

Show useful compiler errors.

Never treat regex substitutions or token replacements as a full language compiler.

The compiler must not emit C# source as its compilation method.

For Windows, support producing genuine PE executables.

Use suitable installed LLVM and Windows linker toolchains.

Generated applications must not require .NET or CHUD Studio.

Where runtime components are needed, compile or link appropriate native libraries.

---

# 7. CHUD RUNTIME

Implement a minimal native runtime.

Initially support:

Application initialization.

Console output.

String representation.

Basic memory allocation.

Program termination.

Runtime error reporting.

Expand later to:

Advanced collections.

Threading.

Asynchronous scheduling.

File operations.

Networking.

Resource management.

Runtime diagnostics.

Keep the runtime as small as practical.

Document ABI conventions and ownership boundaries.

---

# 8. CHUD STANDARD LIBRARY

Create a native CHUD standard library.

All modules should be part of the CHUD ecosystem.

## CHUD.Core

Fundamental types, application operations, and output.

Example APIs:

```rust
CHUD.Print("Hello");
CHUD.Warn("Warning");
CHUD.Error("Error");
```

## CHUD.IO

Files, directories, paths, streams, and input/output operations.

## CHUD.Text

Strings, formatting, encodings, parsing, and string builders.

## CHUD.Math

Mathematical functions, vectors, numerical utilities, and random-number facilities.

## CHUD.Collections

Lists, arrays, sets, dictionaries, queues, and related collection abstractions.

## CHUD.Net

Networking, sockets, and HTTP clients.

## CHUD.Async

Tasks, asynchronous operations, and concurrency utilities.

## CHUD.Memory

Allocation-related facilities and resource-management abstractions.

## CHUD.Debug

Logging, assertions, tracing, and diagnostics.

## CHUD.Time

Time, dates, durations, and timing utilities.

## CHUD.Platform

Platform information and operating-system integration.

Implement CHUD.Core first.

Gradually expand the other modules.

Prefer standard-library implementations written in CHUD when supported by the compiler.

---

# 9. CHUD BUILD SYSTEM

Create a real build tool called `chud`.

Support the following command-line interface:

```powershell
chud --version
chud --help
chud new MyApplication
chud build
chud build --release
chud run
chud check
chud test
chud clean
chud format
```

Later support:

```powershell
chud add PackageName
chud remove PackageName
chud restore
chud publish
chud doctor
```

Each command must have functional behavior before being advertised as implemented.

## Project manifests

Use `chud.toml`.

Example:

```toml
[project]
name = "HelloCHUD"
version = "0.1.0"
type = "executable"
entry = "src/Program.chud"

[build]
target = "windows-x64"
optimization = "debug"

[dependencies]
```

Design formal manifest validation and version handling.

Support multiple source files and eventually library dependencies.

Use separate build directories for intermediate and final outputs.

---

# 10. CHUD PACKAGES

Build the foundation for CHUD Packages.

The package manager should eventually support dependency declarations, local package installation, version constraints, lockfiles, and package caching.

Use `.chudpkg` as the proposed package-distribution extension.

Document its archive format and package metadata.

Do not invent an online registry or claim packages can be downloaded until a real registry or configured source exists.

Start with local path dependencies.

Add remote registries later.

Validate archive paths and package metadata before extraction or installation.

---

# 11. CHUD STUDIO — COMPLETE CUSTOM IDE

Build a standalone Windows desktop IDE named **CHUD Studio**.

CHUD Studio should feel like its own development environment, not a basic text editor with a Run button.

Technology:

Electron.

React.

TypeScript.

Monaco Editor.

Native CHUD compiler integration.

CHUD Language Server integration.

## IDE visual style

Create a professional dark interface.

Default palette:

Background: `#101015`

Editor: `#15151D`

Sidebar: `#1A1A23`

Panels: `#20202A`

Primary accent: `#8B5CF6`

Secondary accent: `#C084FC`

Primary text: `#F1F1F5`

Secondary text: `#9797AA`

Error: `#F87171`

Warning: `#FBBF24`

Success: `#4ADE80`

The appearance should be clean, modern, responsive, and highly customizable.

Use subtle gradients only where appropriate.

Avoid excessive animations and visual clutter.

Build an original CHUD logo and application identity using project-owned artwork or code-generated vector assets.

## Main IDE layout

Top:

Application title, menu bar, project name, and toolbar.

Left:

Project Explorer, Search, Source Control, and Settings.

Center:

Tabbed source editor.

Right:

ChudGPT assistant panel.

Bottom:

Terminal, Output, Problems, Build, and Debug panels.

Allow panels to be resized, collapsed, and rearranged where practical.

Save IDE layout settings between sessions.

## Editor features

Open and save `.chud` files.

Create folders and projects.

Syntax highlighting.

Line numbers.

Bracket matching.

Code folding.

Autocomplete.

Diagnostics.

Hover information.

Find and replace.

Multiple tabs.

Split editor.

File search.

Project search.

Comment toggling.

Automatic indentation.

Code formatting.

Theme customization.

Keyboard shortcuts.

Unsaved file indicators.

Autosave configuration.

## Integrated terminal

Build a functional terminal interface.

Support PowerShell on Windows.

Allow users to run CHUD commands.

Display compiler output accurately.

Display exit codes and process errors.

Do not implement a simulated terminal.

## Build and Run

Add working Build, Run, Stop, and configuration controls.

The Run button must compile and execute the user's actual project.

Show build failures clearly.

Allow choosing debug or release builds.

Never display a success notification when compilation fails.

---

# 12. CHUD LANGUAGE SERVER

Create `chud-lsp`.

Use the Language Server Protocol.

Implement the language server using CHUD compiler frontend components wherever possible.

Support:

Diagnostics.

Autocomplete.

Hover documentation.

Go to definition.

Find references.

Document symbols.

Workspace symbols.

Rename symbol.

Signature help.

Document formatting.

Code actions.

Incremental document updates.

Avoid creating a completely separate language parser in the IDE.

The compiler and language server should agree on syntax and semantics.

Design the implementation so third-party editors can eventually support `.chud` files.

---

# 13. CHUD DEBUGGER

Integrate native debugging into CHUD Studio.

Use a suitable existing debugger backend such as LLDB.

Implement debug information generation in the CHUD compiler.

Eventually support:

Breakpoints.

Continue.

Pause.

Step into.

Step over.

Step out.

Call stacks.

Local variable inspection.

Watch expressions.

Debug console.

Exception and runtime-error reporting.

Use the Debug Adapter Protocol where appropriate.

Do not create fake debugger UI that pretends to control a running program.

Disable unsupported debugging controls until real functionality exists.

---

# 14. CHUDGPT INTEGRATION

CHUD Studio must contain a dedicated AI assistant.

The assistant must connect to the existing ChudGPT infrastructure.

Supported models:

**ChudGPT-Code**

**ChudGPT-Plato**

**ChudGPT-Plato-Mini**

**ChudGPT-Public**

The user must be able to select a model inside CHUD Studio.

## Official resources

https://chudgpt-landing.vercel.app/

https://chudgpt-landing.vercel.app/api-guide

Use the existing ChudGPT API.

Inspect the actual documentation and backend contract.

Verify model IDs and model availability.

Do not invent endpoints.

Do not assume every advertised model is currently online.

Make endpoint URLs and model mappings configurable.

Use an adapter architecture so API changes do not require rewriting the chat interface.

## Chat features

Full chat panel.

Conversation history.

Model switching.

Markdown formatting.

Syntax-highlighted code blocks.

Copy Code.

Clear Conversation.

Stop Generation when supported.

Regenerate Response.

Open chat in a larger panel.

Explain Selected Code.

Explain Compiler Error.

Generate CHUD Function.

Refactor Code.

Fix Diagnostics.

Explain Project.

Suggest Optimization.

Generate Unit Tests.

## AI-assisted editing

When the user asks for a code change, the assistant may generate proposed modifications.

Show the proposed changes in a diff viewer.

Require explicit approval before applying changes.

Do not silently edit project files.

Preserve existing code unless the modification is approved.

## Context handling

Allow the user to attach:

The current file.

Selected code.

Compiler errors.

Specific project files.

Never automatically upload the entire project.

Display which context is being shared.

Apply reasonable context limits.

## Reliability

Support timeouts.

Support request cancellation.

Support backend errors.

Handle unavailable models.

Handle failed connections.

Handle empty responses.

Handle invalid API responses.

Do not fabricate an AI response when ChudGPT is offline.

The IDE must remain fully functional without an internet connection, except for features that actually require online access.

## Security

Use safe IPC between Electron renderer and main processes.

Do not expose unrestricted Node.js access to the editor or AI response renderer.

Keep credentials out of logs.

Protect against unsafe command execution through AI-generated content.

Do not execute AI-generated terminal commands automatically.

---

# 15. CHUD STUDIO SETTINGS

Create a complete settings system.

Settings should include:

Editor font and size.

Theme.

Accent color.

Tab size.

Automatic indentation.

Autosave.

Line numbers.

Word wrap.

Compiler path.

Build configuration.

Default terminal.

Default ChudGPT model.

ChudGPT API base URL.

Request timeout.

Chat history options.

Formatting preferences.

Diagnostic preferences.

Application update preferences.

Store settings persistently.

Validate configuration values.

Allow restoring defaults.

---

# 16. PROJECT TEMPLATES

Support creating new CHUD projects from CHUD Studio.

Initial templates:

Console Application.

Empty Application.

Static Library.

Future templates:

Native GUI Application.

Dynamic Library.

Game Application.

Game Engine Tools.

VR Application.

Networking Application.

Each template must contain real source files and configuration.

Example:

```text
HelloCHUD/
    chud.toml
    src/
        Program.chud
    tests/
    README.md
```

Generated intermediate files must remain outside source directories.

---

# 17. PROJECT REPOSITORY STRUCTURE

Use a modular monorepo.

Suggested structure:

```text
CHUD/
|
+-- compiler/
|   +-- include/
|   +-- src/
|   |   +-- Lexer/
|   |   +-- Parser/
|   |   +-- AST/
|   |   +-- Semantics/
|   |   +-- Types/
|   |   +-- IR/
|   |   +-- Codegen/
|   |   +-- Diagnostics/
|   |   +-- Driver/
|   +-- CMakeLists.txt
|
+-- runtime/
|   +-- include/
|   +-- src/
|
+-- stdlib/
|   +-- Core/
|   +-- IO/
|   +-- Text/
|   +-- Math/
|   +-- Collections/
|   +-- Net/
|   +-- Async/
|   +-- Debug/
|
+-- tools/
|   +-- chud/
|   +-- chud-lsp/
|   +-- chud-fmt/
|   +-- chud-package/
|
+-- studio/
|   +-- electron/
|   +-- src/
|   |   +-- components/
|   |   +-- editor/
|   |   +-- explorer/
|   |   +-- terminal/
|   |   +-- debugger/
|   |   +-- chudgpt/
|   |   +-- settings/
|   |   +-- services/
|   +-- assets/
|
+-- templates/
|   +-- console/
|   +-- empty/
|   +-- library/
|
+-- examples/
|   +-- HelloWorld/
|   +-- Variables/
|   +-- Functions/
|   +-- Conditionals/
|   +-- Loops/
|   +-- Collections/
|
+-- tests/
|   +-- lexer/
|   +-- parser/
|   +-- semantics/
|   +-- codegen/
|   +-- integration/
|   +-- regression/
|
+-- benchmarks/
|
+-- docs/
|   +-- LANGUAGE.md
|   +-- COMPILER.md
|   +-- RUNTIME.md
|   +-- STANDARD_LIBRARY.md
|   +-- STUDIO.md
|   +-- CHUDGPT.md
|   +-- PACKAGES.md
|   +-- ROADMAP.md
|
+-- CMakeLists.txt
+-- README.md
+-- LICENSE
```

Adapt the layout when technical reasons justify doing so.

Do not generate empty directories and unused placeholder files merely to match the diagram.

---

# 18. COMPILER OPTIMIZATION

Design CHUD with performance in mind.

Implement or progressively introduce:

Constant folding.

Dead-code elimination.

Inlining.

Native code optimization.

Release builds.

Debug builds.

Build caching.

Incremental compilation.

Parallel compilation.

Link-time optimization.

Optimization diagnostics.

Compiler statistics.

Keep optimization behavior correct and testable.

Do not assume CHUD automatically outperforms C#, C++, or Rust.

Benchmark real implementations before making performance claims.

---

# 19. CHUD BENCHMARKS

Create an automated benchmark suite.

Benchmark equivalent CHUD and other-language programs.

Initially test:

Integer arithmetic.

Function calls.

Loops.

String operations.

Memory allocation.

Collection operations.

Startup time.

Compilation time.

Native binary size.

Report machine specifications and compilation options.

Keep benchmark results reproducible.

Do not fabricate measurements or remove unfavorable results.

---

# 20. TESTING REQUIREMENTS

Build proper automated test infrastructure.

Every major compiler component must have tests.

## Lexer tests

Valid tokens.

Invalid tokens.

Strings.

Numbers.

Comments.

Operators.

Unicode and UTF-8 behavior.

Source positions.

## Parser tests

Declarations.

Functions.

Expressions.

Operator precedence.

Blocks.

Statements.

Malformed source.

Error recovery.

## Semantic tests

Variable scopes.

Type compatibility.

Function resolution.

Invalid references.

Duplicate declarations.

Return type validation.

## Compiler tests

Successful native compilation.

Failed compilation.

Correct executable output.

Exit codes.

Multiple source files.

Debug and release builds.

## IDE tests

Project creation.

File editing.

Saving.

Build execution.

Compiler diagnostics.

Terminal integration.

ChudGPT API failures.

Model switching.

AI edit approval.

Do not report a feature as complete until its relevant tests pass.

---

# 21. DOCUMENTATION

Write professional documentation.

Include:

Getting started.

Installing CHUD.

Installing CHUD Studio.

Your first CHUD program.

Language syntax.

Type system.

Modules.

Standard library.

Compiler flags.

Project files.

Build system.

ChudGPT integration.

Troubleshooting.

Current limitations.

Development roadmap.

Provide working examples.

Clearly distinguish implemented features from proposed future features.

---

# 22. DEVELOPMENT PLAN

Complete the project incrementally.

Each milestone must leave the repository in a usable and testable condition.

## PHASE 1 — LANGUAGE FOUNDATION

Create the compiler project.

Implement tokens, source handling, the lexer, parser, AST, basic diagnostics, basic semantic analysis, and initial LLVM integration.

Compile a minimal CHUD program into a real Windows executable.

This is the highest priority.

## PHASE 2 — BASIC LANGUAGE

Implement variables, primitive types, arithmetic, functions, scopes, conditionals, loops, and string output.

Add compiler tests.

## PHASE 3 — PROJECT SYSTEM

Implement `chud.toml`, project creation, build configurations, and multi-file compilation.

Build the CHUD CLI.

## PHASE 4 — CHUD RUNTIME AND STANDARD LIBRARY

Implement CHUD.Core and foundational runtime services.

Expand into basic collections, text, math, and file APIs.

## PHASE 5 — CHUD STUDIO

Create the desktop IDE with a working editor, project explorer, build integration, terminal, diagnostics, and settings.

The IDE must work with actual CHUD projects.

## PHASE 6 — CHUDGPT

Integrate all four requested ChudGPT models using their verified APIs.

Create the chat interface and safe code-editing workflow.

## PHASE 7 — LANGUAGE SERVER

Build `chud-lsp` and connect it to CHUD Studio.

Implement diagnostics, completion, navigation, and other editor intelligence.

## PHASE 8 — ADVANCED LANGUAGE

Implement structs, reference types, traits, generics, collections, and advanced type checking.

Resolve the memory-management model consistently.

## PHASE 9 — DEBUGGING AND PACKAGES

Implement native debugging support and the package-management foundation.

## PHASE 10 — PUBLIC ALPHA

Package the compiler and CHUD Studio.

Produce actual Windows release artifacts.

Prepare documentation, examples, automated tests, and a release checklist.

Mark any unfinished features accurately.

---

# 23. INITIAL IMPLEMENTATION REQUIREMENTS

Before coding:

Inspect the current repository.

Check available tools and dependencies.

Detect LLVM, CMake, C++ compilers, Windows SDK, Node.js, and package managers.

Identify missing dependencies.

Use compatible toolchain versions.

Avoid destructive changes to unrelated files.

Create a concise architecture plan.

Then immediately implement the compiler foundation.

Do not stop after writing the plan.

## First required working program

Create `examples/HelloWorld/Program.chud`:

```rust
chud CHUD.App;

use CHUD.Core;

public func Main() -> int
{
    CHUD.Print("Hello from CHUD!");
    return 0;
}
```

Make this program actually compile into a Windows executable.

Run the executable and verify its output.

If all of the proposed syntax cannot be supported initially, implement the minimum required grammar deliberately and explain the limitations.

Do not fake compilation by generating a prebuilt Hello World executable.

Do not secretly compile a corresponding C# program.

The machine code must originate from the actual CHUD frontend and native compilation pipeline.

## Expected validation

```powershell
chud build
```

Expected result after successful implementation:

```text
CHUD Compiler 0.1.0-alpha

Compiling CHUD project...
Building native executable...

Build succeeded.
```

And:

```powershell
chud run
```

Expected application output:

```text
Hello from CHUD!
```

These are acceptance criteria, not permission to print success without compiling.

---

# 24. ENGINEERING RULES

Write production-quality, maintainable code.

Avoid giant monolithic files.

Use clear module boundaries.

Avoid duplicated compiler logic.

Add tests as functionality is implemented.

Do not invent library functionality.

Do not silently skip failed tests.

Do not create fake IDE controls.

Do not replace missing features with canned responses.

Do not fabricate ChudGPT model responses.

Do not pretend the compiler supports syntax it cannot parse.

Prefer real working functionality over ambitious-looking scaffolding.

Preserve project compatibility between milestones.

Explain meaningful architectural decisions.

Keep the language implementation independent of the IDE.

Keep the language specification synchronized with the actual implementation.

When external dependencies are unavailable, implement whatever can genuinely be built and clearly describe what is blocked.

---

# 25. FINAL DIRECTIVE TO CODEX

Build CHUD as an independent programming language and development ecosystem.

The language must be native and ahead-of-time compiled.

Its source files must use `.chud`.

Its public standard library must use CHUD namespaces.

It must have its own compiler, build system, and language tooling.

CHUD Studio must provide a real development environment with integrated ChudGPT chat supporting:

ChudGPT-Code

ChudGPT-Plato

ChudGPT-Plato-Mini

ChudGPT-Public

Prioritize engineering correctness, native compilation, consistent language design, and usable software.

Start implementing immediately.

Do not ask unnecessary questions.

Make reasonable engineering decisions and document them.

Build and test the first functional compiler, then continue through the planned milestones as far as practical.

At every stopping point, report what actually works, what was tested, what remains incomplete, and which milestone should be implemented next.

**The objective is not to create a language that looks like CHUD. The objective is to create a language that IS CHUD.**
