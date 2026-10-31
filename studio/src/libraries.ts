import definitions from "../../runtime/builtins.def?raw";
export const libraries = [
  ...definitions.matchAll(
    /CHUD_BUILTIN\("([^"]+)",\s*(\w+),\s*(\w+)([^\n]*)\)/g,
  ),
].map((match) => ({
  name: match[1],
  module: match[1].slice(0, match[1].lastIndexOf(".")),
  result: match[3].toLowerCase(),
  parameters: [...match[4].matchAll(/Type::(\w+)/g)].map((m) =>
    m[1].toLowerCase(),
  ),
}));
