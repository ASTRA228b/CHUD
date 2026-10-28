# CHUD alpha language

The implemented subset is deliberately small. UTF-8 source accepts an optional BOM. Identifiers use ASCII letters, digits and underscores, beginning with a letter or underscore. Keywords are case sensitive. File extensions accept any case. Diagnostics use one-based lines and UTF-16 columns. Line (`//`) and non-nested block (`/* */`) comments are supported.

## Types and values

`int` is a signed, two's complement 32-bit integer, range −2,147,483,648 to 2,147,483,647. Unsuffixed decimal literals infer `int`. Addition, subtraction, multiplication and negation wrap modulo 2³²; no LLVM no-overflow assumptions are emitted. Division truncates toward zero. Division/remainder by zero or INT_MIN / −1 terminate with runtime error code 70. Ordering is signed. No implicit integer/boolean conversions exist.

`bool` has the values `true` and `false`. `&&` and `||` short circuit. `!` negates a boolean. Comparison and equality yield booleans.

`string` currently means an immutable UTF-8 literal in process-lifetime static storage. Escapes are `\n`, `\r`, `\t`, `\"` and `\\`. NUL and raw line breaks are rejected. Equality compares byte contents. String concatenation, indexing and dynamic strings are future work.

`void` is allowed only as a function result. It cannot be stored or printed. Other primitive names from the master brief are reserved design targets and rejected as unsupported types.

## Bindings and functions

```rust
let name = "CHUD";          // immutable
mut count: int = 0;         // mutable
const MAX_USERS = 100;      // literal constants in this alpha
count += 1;

func Add(a: int, b: int) -> int
{
    return a + b;
}
```

Bindings require initializers. An annotation must exactly match the inferred type. `const` currently accepts literal values (including a negated integer), not arbitrary constant expressions. Assignment and `+=`, `-=`, `*=`, `/=` require a mutable binding. Nested lexical blocks may shadow an outer name; duplicates within one scope are errors. Function parameters are immutable. Function declarations are resolved before bodies, allowing forward calls and recursion. Overloading is not implemented.

An executable requires exactly one `public func Main() -> int` without parameters. Its return value is the process exit status. Explicit non-void functions must return on every path recognized by the frontend. Loops are conservatively considered able to finish. Statements following a proven unconditional return/break/continue are diagnosed as unreachable.

Top-level executable statements create an implicit public Main returning zero if no explicit return is reached. They cannot be combined with another Main, including one from another source file. Top-level bindings are locals in that implicit entry point, not globals.

## Flow

```rust
mut sum = 0;
for number in 0..10 { sum += number; }
while sum < 50 { sum += 1; }
loop { break; }
if sum == 50 { CHUD.Print("Done"); } else { CHUD.Print("Other"); }
```

Ranges are ascending and upper-exclusive. Bounds are integers evaluated once. A start at or above the end produces no iterations. The iteration binding is immutable. `continue` advances a range loop or retests a while loop. `break` leaves the innermost loop. Conditions require `bool`; parentheses are optional. `else if` is supported.

Operator precedence, tightest first: unary `- !`; `* / %`; `+ -`; `< <= > >=`; `== !=`; `&&`; `||`. Binary operators associate left. Calls and function arguments evaluate left to right.

`chud CHUD.App;` declares an accepted module header. `use CHUD.Core;` selects the only implemented builtins. This milestone has one global function namespace across project sources; named user-module resolution and visibility enforcement beyond the public Main requirement are future work. Other imports are rejected.

## Memory and interoperability

Values are scalar locals and static strings. There are no heap objects, references, pointers, resource handles or `unsafe` operations available to user code yet. Scalar values copy; strings refer to immutable, process-lifetime storage. This is the entire implemented lifetime model; no borrow checker, garbage collector or allocator API is promised. Extending it to deterministic resource cleanup requires a new language milestone.

Structs, reference types, traits, generics, collections, `match`, Result, nullability, async, defer, FFI and advanced keywords in the brief are unimplemented. The parser rejects these constructs rather than compiling substitutes.
