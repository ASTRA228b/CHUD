import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { compilerPath } from "../tools/chud/project.mjs";
import { libraryFunctions } from "../tools/chud/libraries.mjs";
import { starters, starterSource } from "../studio/shared/starters.mjs";

async function native(source, verify, { check = false, input = "" } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "chud-libraries-"));
  try {
    const file = path.join(dir, "Program.CHUD"),
      exe = path.join(dir, "Program.exe");
    await fs.writeFile(file, source);
    const compiled = spawnSync(
      compilerPath(),
      [file, "-o", exe, ...(check ? ["--check", "--diagnostics-json"] : [])],
      { encoding: "utf8", timeout: 30000 },
    );
    if (check) return verify(compiled);
    assert.equal(compiled.status, 0, compiled.stderr);
    const result = spawnSync(exe, [], {
      cwd: dir,
      input,
      encoding: "utf8",
      timeout: 10000,
    });
    await verify(result, dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
const lines = (result) => result.stdout.trim().split(/\r?\n/);

test("native math, UTF-8 text, conversion, CHUD game helpers and bool ABI", async () => {
  await native(
    `use CHUD.Math; use CHUD.Text; use CHUD.Convert; use CHUD.Forge; use CHUD.Spark;
    CHUD.Print(CHUD.Math.Abs(-20)); CHUD.Print(CHUD.Math.Min(-3,4)); CHUD.Print(CHUD.Math.Max(3,4));
    CHUD.Print(CHUD.Math.Clamp(22,0,10)); CHUD.Print(CHUD.Math.Pow(2,10)); CHUD.Print(CHUD.Math.Gcd(-48,18));
    CHUD.Print(CHUD.Text.Length("A🟣é")); CHUD.Print(CHUD.Text.Slice("A🟣é",1,2));
    CHUD.Print(CHUD.Text.Concat("Hi ","CHUD")); CHUD.Print(CHUD.Text.Contains("hello","ell"));
    CHUD.Print(CHUD.Text.StartsWith("hello","he")); CHUD.Print(CHUD.Text.EndsWith("hello","lo"));
    CHUD.Print(CHUD.Text.Upper("héllo")); CHUD.Print(CHUD.Text.Lower("CHUD")); CHUD.Print(CHUD.Text.Trim("  hello "));
    CHUD.Print(CHUD.Text.Replace("one one","one","two")); CHUD.Print(CHUD.Text.Repeat("xy",3));
    CHUD.Print(CHUD.Convert.ToString(-2147483648)); CHUD.Print(CHUD.Convert.ToInt("2147483647"));
    CHUD.Print(CHUD.Convert.IsInt("-12")); CHUD.Print(CHUD.Convert.IsInt("12x"));
    CHUD.Print(CHUD.Forge.Wrap(-1,0,8)); CHUD.Print(CHUD.Forge.StepToward(5,20,4));
    CHUD.Print(CHUD.Forge.StepToward(20,5,50)); CHUD.Print(CHUD.Forge.Lerp(-100,100,25));
    CHUD.Print(CHUD.Spark.Bar(5,10,6)); CHUD.Print(CHUD.Spark.Badge("CHUD"));`,
    (r) => {
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(lines(r), [
        "20",
        "-3",
        "4",
        "10",
        "1024",
        "6",
        "3",
        "🟣é",
        "Hi CHUD",
        "true",
        "true",
        "true",
        "HéLLO",
        "chud",
        "hello",
        "two two",
        "xyxyxy",
        "-2147483648",
        "2147483647",
        "true",
        "false",
        "7",
        "9",
        "5",
        "-50",
        "[###---]",
        "[ CHUD ]",
      ]);
    },
  );
});

test("typed integer lists grow, alias, cross functions, sort and remove safely", async () => {
  await native(
    `func First(items: list) -> int { return CHUD.Collections.Get(items,0); }
    public func Main() -> int {
      let items: list = CHUD.Collections.New();
      for i in 0..40 { CHUD.Collections.Add(items,40-i); }
      let alias = items; CHUD.Collections.Set(alias,0,99);
      CHUD.Print(First(items)); CHUD.Print(CHUD.Collections.Count(items));
      CHUD.Collections.Sort(items); CHUD.Print(First(items));
      CHUD.Print(CHUD.Collections.Contains(items,99)); CHUD.Print(CHUD.Collections.Contains(items,0));
      CHUD.Collections.RemoveAt(items,39); CHUD.Print(CHUD.Collections.Sum(items));
      CHUD.Collections.Clear(items); CHUD.Print(CHUD.Collections.Count(items)); return 0;
    }`,
    (r) => {
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(lines(r), [
        "99",
        "40",
        "1",
        "true",
        "false",
        "780",
        "0",
      ]);
    },
  );
});

test("file/path libraries preserve UTF-8 filenames and console input", async () => {
  await native(
    `let file = CHUD.Path.Combine(".","音楽.txt");
    CHUD.IO.WriteText(file,"héllo 🟣"); CHUD.IO.AppendText(file," world");
    CHUD.Print(CHUD.IO.Exists(file)); CHUD.Print(CHUD.IO.ReadText(file));
    CHUD.Print(CHUD.Path.FileName("a/b/test.chud")); CHUD.Print(CHUD.Path.Extension("a.b/test.chud"));
    CHUD.Print(CHUD.Path.DirectoryName("a/b/test.chud")); CHUD.Print(CHUD.IO.ReadLine());`,
    async (r, dir) => {
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(lines(r), [
        "true",
        "héllo 🟣 world",
        "test.chud",
        ".chud",
        "a/b",
        "console input",
      ]);
      assert.equal(
        await fs.readFile(path.join(dir, "音楽.txt"), "utf8"),
        "héllo 🟣 world",
      );
    },
    { input: "console input\r\n" },
  );
});

test("random ranges, deterministic seeds and monotonic clock work natively", async () => {
  await native(
    `CHUD.Random.Seed(123); let first = CHUD.Random.Range(-50,50);
    CHUD.Random.Seed(123); CHUD.Print(first == CHUD.Random.Range(-50,50));
    mut valid = true; for i in 0..1000 { let n = CHUD.Random.Range(-5,6); if n < -5 || n >= 6 { valid = false; } }
    CHUD.Print(valid); let start = CHUD.Time.Millis(); CHUD.Time.Sleep(15);
    CHUD.Print(CHUD.Time.Millis() - start >= 10); CHUD.Print(CHUD.Time.Now() > 0);`,
    (r) => {
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(lines(r), ["true", "true", "true", "true"]);
    },
  );
});

test("invalid calls are rejected at compile time with useful diagnostics", async () => {
  for (const [source, expected] of [
    ["use CHUD.Missing;", /Unknown library/],
    ['CHUD.Math.Abs("x");', /Expected int/],
    ['CHUD.Text.Slice("x",0);', /argument count/],
    ["CHUD.Collections.Get(5,0);", /Expected list/],
    ["CHUD.Print(CHUD.Collections.New());", /Cannot print list/],
  ])
    await native(
      source,
      (r) => {
        assert.equal(r.status, 1);
        assert.match(r.stdout, expected);
      },
      { check: true },
    );
});

test("bounds and overflow failures exit cleanly with runtime diagnostics", async () => {
  for (const source of [
    "CHUD.Print(CHUD.Math.Abs(-2147483648));",
    'CHUD.Print(CHUD.Text.Slice("abc",2,2));',
    "CHUD.Print(CHUD.Collections.Get(CHUD.Collections.New(),0));",
    'CHUD.Print(CHUD.Convert.ToInt("2147483648"));',
    "CHUD.Print(CHUD.Random.Range(1,1));",
    'CHUD.Print(CHUD.Text.Repeat("abc",2147483647));',
  ])
    await native(source, (r) => {
      assert.equal(r.status, 70, r.stderr);
      assert.match(r.stderr, /CHUD Runtime:/);
    });
});

test("every Basic assistant starter compiles, including escaped user titles", async () => {
  for (const s of starters) {
    await native(
      starterSource(s.id, 'A "title" \\ 🟣\nnew line'),
      (r) => assert.equal(r.status, 0, `${s.id}: ${r.stdout} ${r.stderr}`),
      { check: true },
    );
  }
  assert.ok(libraryFunctions.length >= 60);
  assert.ok(libraryFunctions.some((f) => f.label === "CHUD.GUI.Button"));
  assert.throws(() => starterSource("missing"), /Unknown starter/);
});

test("native GUI links and completes a real frame and close cycle", async () => {
  await native(
    `CHUD.GUI.Open("CHUD GUI runtime test",320,240);
    if CHUD.GUI.BeginFrame() {
      CHUD.GUI.Label(10,10,200,24,"CHUD"); CHUD.GUI.Box(10,40,200,30,"Box");
      CHUD.Print(CHUD.GUI.Button(10,80,200,30,"Button"));
      CHUD.Print(CHUD.GUILayout.Toggle("Toggle",true));
      CHUD.Print(CHUD.GUILayout.Slider("Slider",50,0,100));
      CHUD.GUI.Close(); CHUD.GUI.EndFrame();
    }
    CHUD.Print(CHUD.GUI.BeginFrame());`,
    (r) => {
      assert.equal(r.status, 0, r.stderr);
      assert.deepEqual(lines(r), ["false", "true", "50", "false"]);
    },
  );
});
