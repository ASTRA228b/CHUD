import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { root, createProject, loadProject } from "../tools/chud/project.mjs";
test("project creation, check, build, execution, tests and clean operate on real files", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "chud-project-"));
  const directory = path.join(temp, "Example");
  const cli = (command, ...args) =>
    spawnSync(
      process.execPath,
      [path.join(root, "tools/chud/chud.mjs"), command, ...args],
      { cwd: directory, encoding: "utf8", timeout: 30000 },
    );
  try {
    await createProject(directory);
    await assert.rejects(createProject(directory));
    const project = await loadProject(directory);
    assert.equal(project.name, "Example");
    assert.equal(project.sources.length, 1);
    for (const command of ["check", "build", "run"]) {
      const r = cli(command);
      assert.equal(r.status, 0, r.stderr);
      if (command === "run") assert.match(r.stdout, /Hello from CHUD!/);
    }
    await fs.mkdir(path.join(directory, "tests"));
    await fs.writeFile(
      path.join(directory, "tests/smoke.chud"),
      "public func Main() -> int { return 0; }",
    );
    assert.equal(cli("test").status, 0);
    await fs.writeFile(
      path.join(directory, "src/Program.chud"),
      "public func Main() -> int { return false; }",
    );
    const failed = cli("build");
    assert.equal(failed.status, 1);
    assert.doesNotMatch(failed.stdout, /Build succeeded/);
    assert.equal(cli("clean").status, 0);
    await assert.rejects(fs.stat(path.join(directory, ".chud")));
    await fs.appendFile(path.join(directory, "chud.toml"), "bad = true\n");
  } finally {
    await fs.rm(temp, { force: true, recursive: true });
  }
});
test("manifest validation rejects unsafe paths and unsupported dependencies", async () => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "chud-manifest-"));
  const directory = path.join(temp, "Example");
  try {
    await createProject(directory);
    const file = path.join(directory, "chud.toml"),
      original = await fs.readFile(file, "utf8");
    await fs.writeFile(
      file,
      original.replace("src/Program.chud", "../outside.chud"),
    );
    await fs.writeFile(path.join(temp, "outside.chud"), "return 0;");
    await assert.rejects(loadProject(directory), /inside the project/);
    await fs.writeFile(file, original + 'SomePackage = "1.0.0"\n');
    await assert.rejects(loadProject(directory), /not implemented/);
  } finally {
    await fs.rm(temp, { force: true, recursive: true });
  }
});
