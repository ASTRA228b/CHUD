import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import TOML from "@iarna/toml";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const compilerPath = () =>
  process.env.CHUD_COMPILER ||
  path.join(
    root,
    "build/bin",
    process.platform === "win32" ? "chudc.exe" : "chudc",
  );
export const exampleSource = `chud CHUD.App;

use CHUD.Core;

public func Main() -> int
{
    CHUD.Print("Hello from CHUD!");
    return 0;
}
`;
export function inside(rootDir, candidate) {
  const relative = path.relative(rootDir, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
export async function sourceFiles(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await sourceFiles(full)));
    else if (/\.chud$/i.test(entry.name)) result.push(full);
  }
  return result.sort();
}
export async function loadProject(directory) {
  const projectRoot = await fs.realpath(directory);
  const manifest = TOML.parse(
    await fs.readFile(path.join(projectRoot, "chud.toml"), "utf8"),
  );
  const p = manifest.project;
  if (
    !p ||
    typeof p.name !== "string" ||
    !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(p.name)
  )
    throw new Error(
      "project.name must be 1–64 letters, digits, underscores or hyphens, starting with a letter",
    );
  if (
    typeof p.version !== "string" ||
    !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(p.version)
  )
    throw new Error("project.version must be a semantic version");
  if (p.type !== "executable")
    throw new Error("Only executable projects are implemented in this alpha");
  if (
    typeof p.entry !== "string" ||
    !/\.chud$/i.test(p.entry) ||
    path.isAbsolute(p.entry)
  )
    throw new Error("project.entry must be a relative .chud path");
  const entry = await fs.realpath(path.resolve(projectRoot, p.entry));
  if (!inside(projectRoot, entry))
    throw new Error("Entry must stay inside the project");
  const sourceRoot = path.join(projectRoot, "src");
  if (!inside(sourceRoot, entry)) throw new Error("Entry must be inside src/");
  if (manifest.dependencies && Object.keys(manifest.dependencies).length)
    throw new Error("Package dependencies are not implemented yet");
  if (manifest.build?.target && manifest.build.target !== "windows-x64")
    throw new Error("This alpha supports windows-x64 projects");
  if (
    manifest.build?.optimization &&
    !["debug", "release"].includes(manifest.build.optimization)
  )
    throw new Error("build.optimization must be debug or release");
  const sources = await sourceFiles(sourceRoot);
  if (!sources.includes(entry))
    throw new Error("Project entry is not a regular source file");
  return { directory: projectRoot, manifest, sources, name: p.name };
}
export async function createProject(
  directory,
  name = path.basename(directory),
  empty = false,
) {
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name))
    throw new Error("Invalid project name");
  await fs.mkdir(directory); // Deliberately refuses to overwrite any existing directory.
  await fs.mkdir(path.join(directory, "src"));
  await fs.writeFile(
    path.join(directory, "chud.toml"),
    `[project]\nname = "${name}"\nversion = "0.1.0"\ntype = "executable"\nentry = "src/Program.chud"\n\n[build]\ntarget = "windows-x64"\noptimization = "debug"\n\n[dependencies]\n`,
  );
  await fs.writeFile(
    path.join(directory, "src/Program.chud"),
    empty ? "public func Main() -> int\n{\n    return 0;\n}\n" : exampleSource,
  );
  await fs.writeFile(
    path.join(directory, "README.md"),
    `# ${name}\n\nBuild with \`chud build\` and execute with \`chud run\`.\n`,
  );
  await fs.writeFile(path.join(directory, ".gitignore"), ".chud/\n");
}
