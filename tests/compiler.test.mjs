import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { compilerPath } from "../tools/chud/project.mjs";

const compiler = compilerPath();
async function fixture(source, options = []) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "chud-native-"));
  const file = path.join(directory, "Program.CHUD"),
    exe = path.join(directory, "Program.exe");
  await fs.writeFile(file, source);
  const result = spawnSync(compiler, [file, "-o", exe, ...options], {
    encoding: "utf8",
    timeout: 30000,
  });
  return {
    directory,
    file,
    exe,
    result,
    clean: () => fs.rm(directory, { recursive: true, force: true }),
  };
}
async function check(source, expected) {
  const f = await fixture(source, ["--check", "--diagnostics-json"]);
  try {
    assert.equal(f.result.status, 1, f.result.stderr);
    const errors = JSON.parse(f.result.stdout);
    assert.ok(errors.length);
    assert.match(errors[0].message, expected);
    assert.ok(errors[0].line >= 1 && errors[0].column >= 1);
  } finally {
    await f.clean();
  }
}
test("native PE executable originates from CHUD source and emits UTF-8 output", async () => {
  const f = await fixture(
    'chud CHUD.App; use CHUD.Core; public func Main() -> int { CHUD.Print("Hello from CHUD! 🟣"); return 0; }',
  );
  try {
    assert.equal(f.result.status, 0, f.result.stderr);
    const bytes = await fs.readFile(f.exe);
    assert.equal(bytes.toString("ascii", 0, 2), "MZ");
    const pe = bytes.readUInt32LE(0x3c);
    assert.equal(bytes.toString("ascii", pe, pe + 4), "PE\0\0");
    assert.equal(bytes.readUInt16LE(pe + 4), 0x8664);
    const run = spawnSync(f.exe, [], { encoding: "utf8" });
    assert.equal(run.status, 0);
    assert.equal(run.stdout.trim(), "Hello from CHUD! 🟣");
    assert.match(
      await fs.readFile(f.exe.replace(".exe", ".ll"), "utf8"),
      /define i32 @main/,
    );
  } finally {
    await f.clean();
  }
});
test("debug and release preserve functions, precedence, loops, scopes and short circuiting", async () => {
  const source = `func Add(a: int, b: int) -> int { return a + b; }
  public func Main() -> int {
    mut sum = 0;
    for i in 0..10 { if i == 4 { continue; } sum += i; }
    while sum < 42 { sum += 1; }
    loop { sum += 1; break; }
    { let sum = "shadow"; CHUD.Print(sum); }
    CHUD.Print(sum); CHUD.Print(Add(2, 3) * 4 + 1);
    CHUD.Print(false && 1 / 0 == 0); CHUD.Print(true || 1 / 0 == 0);
    CHUD.Print("CHUD" == "CHUD"); CHUD.Print("CHUD" != "other");
    return 7;
  }`;
  for (const options of [[], ["--release"]]) {
    const f = await fixture(source, options);
    try {
      assert.equal(f.result.status, 0, f.result.stderr);
      const run = spawnSync(f.exe, [], { encoding: "utf8" });
      assert.equal(run.status, 7);
      assert.deepEqual(run.stdout.trim().split(/\r?\n/), [
        "shadow",
        "43",
        "21",
        "false",
        "true",
        "true",
        "true",
      ]);
    } finally {
      await f.clean();
    }
  }
});
test("division errors have deterministic runtime failure instead of undefined behavior", async () => {
  for (const expression of ["1 / 0", "-2147483648 / -1", "-2147483648 % -1"]) {
    const f = await fixture(
      `public func Main() -> int { CHUD.Print(${expression}); return 0; }`,
    );
    try {
      assert.equal(f.result.status, 0, f.result.stderr);
      const run = spawnSync(f.exe, [], { encoding: "utf8" });
      assert.equal(run.status, 70);
      assert.match(run.stderr, /CHUD Runtime/);
    } finally {
      await f.clean();
    }
  }
});
test("int arithmetic wraps, signed comparisons and boolean negation are defined", async () => {
  const f = await fixture(
    "public func Main() -> int { CHUD.Print(2147483647 + 1); CHUD.Print(-3 < 1); CHUD.Print(!false); return 0; }",
  );
  try {
    assert.equal(f.result.status, 0, f.result.stderr);
    assert.deepEqual(
      spawnSync(f.exe, [], { encoding: "utf8" }).stdout.trim().split(/\r?\n/),
      ["-2147483648", "true", "true"],
    );
  } finally {
    await f.clean();
  }
});
test("top-level programs receive a real native entry point", async () => {
  const f = await fixture('CHUD.Print("Top level");');
  try {
    assert.equal(f.result.status, 0, f.result.stderr);
    assert.equal(
      spawnSync(f.exe, [], { encoding: "utf8" }).stdout.trim(),
      "Top level",
    );
  } finally {
    await f.clean();
  }
});
test("frontend diagnostics reject invalid programs", async () => {
  const cases = [
    ["let a = 1; a = 2;", /immutable/],
    ["let a: bool = 1;", /Expected bool/],
    ["CHUD.Print(missing);", /Unknown binding/],
    ["let x = 1; let x = 2;", /Duplicate binding/],
    ["break;", /outside a loop/],
    ["let x = 2147483648;", /outside the int range/],
    ['CHUD.Print("bad\\q");', /Unsupported string escape/],
    ['CHUD.Print("unclosed);', /Unterminated string/],
    ["/* unterminated", /Unterminated block comment/],
    ["if 1 { CHUD.Print(1); }", /Expected bool/],
    ["let x = true + false;", /Expected int/],
    ["let x: double = 1;", /Unsupported type/],
    ["const x = CHUD.Print(1);", /const initializers/],
    ["type Player {}", /Expected expression/],
    ["CHUD.Print(@);", /Unexpected byte/],
    ["return true;", /Expected int/],
    ["CHUD.Print(1, 2);", /requires one argument/],
    ["return 0; CHUD.Print(1);", /Unreachable/],
  ];
  for (const [body, message] of cases)
    await check(`public func Main() -> int { ${body} return 0; }`, message);
  await check("func Main() -> int { return 0; }", /Entry point/);
  await check("public func Main() -> int {}", /without returning/);
  await check(
    "func F() -> int { return true; } public func Main() -> int { return 0; }",
    /Expected int/,
  );
  await check(
    "func F(a: int) -> int { return a; } public func Main() -> int { return F(false); }",
    /Expected int/,
  );
  await check(
    "func F() -> void {} func F() -> void {} public func Main() -> int { return 0; }",
    /Duplicate function/,
  );
});
test("parser recovers to report multiple function syntax errors with source positions", async () => {
  const f = await fixture(
    "func Bad( -> int {}\nfunc AlsoBad( -> int {}\npublic func Main() -> int { return 0; }",
    ["--check", "--diagnostics-json"],
  );
  try {
    const errors = JSON.parse(f.result.stdout);
    assert.equal(errors.length, 2);
    assert.equal(errors[0].line, 1);
    assert.equal(errors[1].line, 2);
  } finally {
    await f.clean();
  }
});
test("UTF-8 validation, BOM, comments and UTF-16 source columns", async () => {
  const good = await fixture(
    '\uFEFF// header\n/* block */ public func Main() -> int { CHUD.Print("line\\ntext"); return 0; }',
    ["--check"],
  );
  try {
    assert.equal(good.result.status, 0, good.result.stderr);
  } finally {
    await good.clean();
  }
  const unicode = await fixture(
    'public func Main() -> int { CHUD.Print("🟣"); @ }',
    ["--check", "--diagnostics-json"],
  );
  try {
    const errors = JSON.parse(unicode.result.stdout);
    assert.equal(
      errors[0].column,
      'public func Main() -> int { CHUD.Print("🟣"); '.length + 1,
    );
  } finally {
    await unicode.clean();
  }
  const invalid = await fixture(Buffer.from([0xc0, 0x80]), [
    "--check",
    "--diagnostics-json",
  ]);
  try {
    assert.equal(invalid.result.status, 1);
    assert.match(JSON.parse(invalid.result.stdout)[0].message, /valid UTF-8/);
  } finally {
    await invalid.clean();
  }
});
test("multiple source files resolve function signatures and calls", async () => {
  const f = await fixture(
    "public func Main() -> int { CHUD.Print(Double(6)); return 0; }",
  );
  try {
    const helper = path.join(f.directory, "Helpers.chud");
    await fs.writeFile(helper, "func Double(x: int) -> int { return x * 2; }");
    const compile = spawnSync(compiler, [f.file, helper, "-o", f.exe], {
      encoding: "utf8",
    });
    assert.equal(compile.status, 0, compile.stderr);
    assert.equal(
      spawnSync(f.exe, [], { encoding: "utf8" }).stdout.trim(),
      "12",
    );
  } finally {
    await f.clean();
  }
});
