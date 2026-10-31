import fs from "node:fs/promises";
import { libraryFunctions } from "../tools/chud/libraries.mjs";
let text =
  "# CHUD library API signatures\n\nGenerated from `runtime/builtins.def`. Parameter positions and types are shown below; semantics and argument names are documented in [Libraries](LIBRARIES.md) and [GUI](GUI.md).\n\n";
let current = "";
for (const fn of libraryFunctions) {
  const module = fn.label.slice(0, fn.label.lastIndexOf("."));
  if (module !== current) {
    current = module;
    text += `## ${module}\n\n| Function | Signature |\n| --- | --- |\n`;
  }
  text += `| \`${fn.label}\` | \`${fn.detail}\` |\n`;
  const next = libraryFunctions[libraryFunctions.indexOf(fn) + 1];
  if (!next || !next.label.startsWith(module + ".")) text += "\n";
}
await fs.writeFile(new URL("../docs/LIBRARY-API.md", import.meta.url), text);
console.log(`Documented ${libraryFunctions.length} native functions.`);
