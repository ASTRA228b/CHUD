#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import {
  compilerPath,
  createProject,
  inside,
  loadProject,
  sourceFiles,
} from "./project.mjs";

function run(exe, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, { cwd, stdio: "inherit", shell: false });
    child.on("error", reject);
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 130 : 1)));
  });
}
async function main() {
  const [command = "--help", ...args] = process.argv.slice(2);
  if (command === "--version") {
    console.log("CHUD Build 0.1.0-alpha");
    return 0;
  }
  if (command === "--help") {
    console.log(
      "CHUD Build\nchud new <Name> [--empty]\nchud build [--release]\nchud run [--release]\nchud check\nchud test [--release]\nchud clean",
    );
    return 0;
  }
  if (command === "new") {
    if (!args[0] || args.slice(1).some((a) => a !== "--empty"))
      throw new Error("Usage: chud new <Name> [--empty]");
    const directory = path.resolve(args[0]);
    await createProject(
      directory,
      path.basename(directory),
      args.includes("--empty"),
    );
    console.log(`Created CHUD project: ${directory}`);
    return 0;
  }
  if (!["build", "run", "check", "test", "clean"].includes(command))
    throw new Error(`Unknown command: ${command}`);
  if (
    args.some((a) => a !== "--release") ||
    (args.length && ["check", "clean"].includes(command))
  )
    throw new Error("Unsupported option");
  const project = await loadProject(process.cwd());
  const release =
    args.includes("--release") ||
    project.manifest.build?.optimization === "release";
  const buildRoot = path.join(project.directory, ".chud");
  try {
    if ((await fs.lstat(buildRoot)).isSymbolicLink())
      throw new Error("Build directory must not be a symbolic link");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  if (command === "clean") {
    if (!inside(project.directory, buildRoot))
      throw new Error("Invalid build directory");
    await fs.rm(buildRoot, { force: true, recursive: true });
    console.log("CHUD build files removed.");
    return 0;
  }
  const directory = path.join(buildRoot, release ? "release" : "debug");
  await fs.mkdir(directory, { recursive: true });
  if (!inside(buildRoot, await fs.realpath(directory)))
    throw new Error(
      "Build output resolves outside the project build directory",
    );
  const exe = path.join(
    directory,
    project.name + (process.platform === "win32" ? ".exe" : ""),
  );
  if (command === "test") {
    let tests;
    try {
      tests = await sourceFiles(path.join(project.directory, "tests"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
      tests = [];
    }
    if (!tests.length)
      throw new Error(
        "No tests/*.chud programs found; each test must have its own Main and return zero on success",
      );
    let index = 0;
    for (const test of tests) {
      const output = path.join(directory, `test-${index++}.exe`);
      const code = await run(
        compilerPath(),
        [test, "-o", output, ...(release ? ["--release"] : [])],
        project.directory,
      );
      if (code) return code;
      const result = await run(output, [], project.directory);
      if (result) return result;
    }
    console.log(`${tests.length} CHUD tests passed.`);
    return 0;
  }
  console.log(
    "CHUD Compiler 0.1.0-alpha\n\n" +
      (command === "check"
        ? "Checking CHUD project..."
        : "Compiling CHUD project...\nBuilding native executable..."),
  );
  const code = await run(
    compilerPath(),
    [
      ...project.sources,
      "-o",
      exe,
      ...(command === "check" ? ["--check"] : []),
      ...(release ? ["--release"] : []),
    ],
    project.directory,
  );
  if (code) {
    console.error("Build failed.");
    return code;
  }
  console.log(command === "check" ? "Check succeeded." : "Build succeeded.");
  return command === "run" ? run(exe, [], project.directory) : 0;
}
main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((e) => {
    console.error(`CHUD Build: ${e.message}`);
    process.exitCode = 1;
  });
