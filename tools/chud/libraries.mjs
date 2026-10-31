import { readFileSync } from "node:fs";
const definitions = readFileSync(
  new URL("../../runtime/builtins.def", import.meta.url),
  "utf8",
);
export const libraryFunctions = [
  ...definitions.matchAll(
    /CHUD_BUILTIN\("([^"]+)",\s*(\w+),\s*(\w+)([^\n]*)\)/g,
  ),
].map((m) => ({
  label: m[1],
  kind: 3,
  detail: `(${[...m[4].matchAll(/Type::(\w+)/g)].map((p) => p[1].toLowerCase()).join(", ")}) -> ${m[3].toLowerCase()}`,
}));
