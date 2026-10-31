# CHUD native libraries

CHUD includes native, statically checked functions inspired by familiar Python and C# tasks, plus original CHUD helpers. They are implemented in the CHUD C runtime, not wrappers around Python, .NET, or Unity. No extra language runtime or package install is needed to run the compiled executable.

`use CHUD.Text;` validates an available library name. Calls are always fully qualified, for example `CHUD.Text.Trim(" CHUD ")`. Imports do not introduce short aliases. CHUD.Core supplies `CHUD.Print`, `CHUD.Warn`, and `CHUD.Error`. The compiler rejects unknown modules, wrong argument counts and wrong types before linking. The catalog in `runtime/builtins.def` is shared by compiler checking, Studio completion, the library browser, and the language server.

## Quick start

```rust
use CHUD.Text;
use CHUD.Collections;

public func Main() -> int {
    CHUD.Print(CHUD.Text.Upper(CHUD.Text.Trim("  hello  ")));
    let scores: list = CHUD.Collections.New();
    CHUD.Collections.Add(scores, 42);
    CHUD.Collections.Add(scores, 17);
    CHUD.Collections.Sort(scores);
    CHUD.Print(CHUD.Collections.Get(scores, 0)); // 17
    CHUD.Print(CHUD.Collections.Sum(scores));    // 59
    return 0;
}
```

From the repository root:

```powershell
Push-Location examples/LibraryTour
node ../../tools/chud/chud.mjs run
Pop-Location
```

Alternatively open `examples/LibraryTour` in Studio and press Run. CLI commands can also be run from inside the example directory with `chud run`.

## Library behavior

| Library            | Purpose and contracts                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHUD.Math`        | Signed integer Abs, Min, Max, inclusive Clamp, nonnegative integer Pow, and nonnegative Gcd. Invalid ranges and overflow are runtime errors. `Pow(0,0)` returns 1.                                                                                                                                                                                                                                                                                      |
| `CHUD.Text`        | Immutable strings. Length and Slice count Unicode code points, not grapheme clusters; Slice takes a zero-based start and a count, with checked bounds. Concat, Contains, StartsWith, EndsWith, Replace and Repeat work on UTF-8 text. Replace replaces non-overlapping occurrences and rejects an empty search. Upper/Lower change ASCII letters while preserving other characters. Trim removes ASCII whitespace.                                      |
| `CHUD.Convert`     | ToString formats an int; ToInt parses an optional sign followed by decimal digits with no surrounding whitespace. IsInt checks the same rule without throwing. Parse and range failures terminate with an error; check IsInt first for user input.                                                                                                                                                                                                      |
| `CHUD.IO`          | ReadLine reads one line from stdin without the trailing newline and returns empty text at EOF. ReadText accepts UTF-8 files without NUL bytes, up to 16 MiB. WriteText replaces a file; AppendText creates/appends. Exists tests a file or directory. Paths are UTF-8, including on Windows. Relative paths resolve against the process working directory. No directories are created automatically. IO failures report an error.                       |
| `CHUD.Path`        | Lexical Combine, FileName, Extension and DirectoryName accept `/` or `\`. An absolute second path replaces the first. Extension includes the dot, or is empty (including a lone leading dot). A trailing separator has an empty FileName. These functions do not access the filesystem or sandbox a path.                                                                                                                                               |
| `CHUD.Random`      | Seed makes repeatable sequences. Range includes its minimum and excludes its maximum; minimum must be smaller. Intended for games and examples, not cryptography. Without Seed, the first use initializes the generator from the clock/process.                                                                                                                                                                                                         |
| `CHUD.Time`        | Now returns Unix seconds, restricted by the signed 32-bit int range. Millis returns monotonic milliseconds since its first call, wrapping after 2^31 milliseconds (about 24.9 days). Sleep blocks the calling thread for a nonnegative duration; it is not an asynchronous timer.                                                                                                                                                                       |
| `CHUD.Collections` | `list` is a typed, mutable integer list. New, Add, Get, Set, Count, RemoveAt, Clear, Contains, Sort and Sum. Indexes are zero-based and checked; Sort is ascending and mutates the list. Lists can be passed/returned by functions. Assigning a list aliases the same collection; an immutable binding still allows collection mutation. Equality is identity, not item equality. Sum checks final-result overflow. Maximum one million items per list. |
| `CHUD.Forge`       | Original game helpers: Wrap uses an exclusive upper bound and handles negative input; StepToward moves toward a target by a nonnegative step without overshooting; Lerp uses a percentage clamped to 0..100, with integer division truncating toward zero.                                                                                                                                                                                              |
| `CHUD.Spark`       | Original console helpers: Bar(value, maximum, width) returns an ASCII `[###---]` bar. Values are clamped; maximum must be positive and width 1..200. Badge(text) returns `[ text ]`.                                                                                                                                                                                                                                                                    |
| `CHUD.GUI`         | Native Windows immediate-mode window and explicitly positioned controls. See [GUI](GUI.md).                                                                                                                                                                                                                                                                                                                                                             |
| `CHUD.GUILayout`   | Automatic vertical placement for labels, integer values, buttons, toggles, sliders and spacing. See [GUI](GUI.md).                                                                                                                                                                                                                                                                                                                                      |

## Lifetimes, limits and errors

Library-created strings and lists remain valid until process exit; the runtime frees their allocations at exit. There is no garbage collector, user Free, or per-frame arena. A 64 MiB total live library allocation budget bounds memory use. Individual text results/files are limited to 16 MiB. Prefer `GUILayout.Value` for frequently changing numbers rather than allocating text every frame. Repeatedly making new strings/lists in an infinite loop can exhaust the budget. List Clear retains capacity. GUI backing surfaces are separately owned and released by the native GUI implementation.

An invalid index, invalid conversion, arithmetic overflow in a library, oversized allocation, IO failure, or invalid GUI sequence writes `CHUD Runtime: …` to stderr and exits with code 70. There are no catch/Result semantics yet. Ordinary language `+`, `-`, and `*` still have the wrapping behavior described in [Language](LANGUAGE.md).

ReadLine is usable from a normal terminal. Studio currently captures output but does not supply interactive stdin, so input-driven console programs should run in an external terminal. The included starters avoid requiring console input. These libraries do not provide floats, generic lists, dictionaries, Python imports, C# assemblies, Unity projects, networking, or a package registry.

## Function signatures

See [API signatures](LIBRARY-API.md) for every function. Regenerate that reference with `node scripts/library-reference.mjs` after changing the builtin catalog.
