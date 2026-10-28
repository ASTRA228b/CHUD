import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Enumerate explicitly: shell globs and directory discovery differ across
// Windows shells and supported Node releases.
const tests = fs
  .readdirSync("tests")
  .filter((name) => /\.test\.[cm]js$/.test(name))
  .sort()
  .map((name) => path.resolve("tests", name));
if (!tests.length) throw new Error("No automated tests found");
const result = spawnSync(process.execPath, ["--test", ...tests], {
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
