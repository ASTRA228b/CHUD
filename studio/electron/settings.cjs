const fs = require("node:fs/promises");
const path = require("node:path");
const defaults = Object.freeze({
  fontSize: 14,
  tabSize: 4,
  wordWrap: false,
  autosave: false,
  compilerPath: "",
  configuration: "debug",
  assistantModel: "code",
  mainBaseUrl: "https://chudgpt-xi.vercel.app",
  publicBaseUrl: "https://chudgpt-public.vercel.app",
  requestTimeout: 90000,
  discord: Object.freeze({
    enabled: false,
    applicationId: "",
    showProject: false,
    showFile: false,
    showElapsed: true,
  }),
});
function validateSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid settings");
  const s = structuredClone(defaults);
  for (const key of Object.keys(s))
    if (key !== "discord" && Object.hasOwn(input, key)) s[key] = input[key];
  const d = input.discord;
  if (d !== undefined) {
    if (!d || typeof d !== "object" || Array.isArray(d))
      throw new Error("Invalid Discord settings");
    for (const key of Object.keys(s.discord))
      if (Object.hasOwn(d, key)) s.discord[key] = d[key];
  }
  if (!Number.isInteger(s.fontSize) || s.fontSize < 10 || s.fontSize > 32)
    throw new Error("Font size must be 10–32");
  if (![2, 4, 8].includes(s.tabSize))
    throw new Error("Tab size must be 2, 4 or 8");
  for (const key of ["wordWrap", "autosave"])
    if (typeof s[key] !== "boolean") throw new Error(`Invalid ${key}`);
  if (!["debug", "release"].includes(s.configuration))
    throw new Error("Invalid build configuration");
  if (!["code", "plato", "plato-mini", "public"].includes(s.assistantModel))
    throw new Error("Unknown ChudGPT model");
  if (typeof s.compilerPath !== "string" || s.compilerPath.length > 2048)
    throw new Error("Invalid compiler path");
  if (
    !Number.isInteger(s.requestTimeout) ||
    s.requestTimeout < 5000 ||
    s.requestTimeout > 180000
  )
    throw new Error("Request timeout must be 5–180 seconds");
  for (const key of ["mainBaseUrl", "publicBaseUrl"]) {
    if (typeof s[key] !== "string") throw new Error("Invalid API URL");
    const url = new URL(s[key]);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.protocol !== "https:" &&
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    )
      throw new Error("API URL must use HTTPS (HTTP is allowed for localhost)");
    s[key] = url.href.replace(/\/$/, "");
  }
  for (const key of ["enabled", "showProject", "showFile", "showElapsed"])
    if (typeof s.discord[key] !== "boolean")
      throw new Error(`Invalid Discord ${key}`);
  if (typeof s.discord.applicationId !== "string")
    throw new Error("Application ID must be text");
  s.discord.applicationId = s.discord.applicationId.trim();
  if (
    (s.discord.enabled || s.discord.applicationId) &&
    !/^\d{17,20}$/.test(s.discord.applicationId)
  )
    throw new Error(
      "Discord application ID must be 17–20 digits. Copy it from your Discord application’s General Information page.",
    );
  return s;
}
class SettingsStore {
  constructor(directory) {
    this.file = path.join(directory, "settings.json");
    this.value = structuredClone(defaults);
  }
  async load() {
    try {
      this.value = validateSettings(
        JSON.parse(await fs.readFile(this.file, "utf8")),
      );
    } catch (e) {
      if (e.code !== "ENOENT")
        this.loadWarning =
          "Saved settings could not be read. Defaults are active.";
    }
    return structuredClone(this.value);
  }
  async save(input) {
    const validated = validateSettings(input);
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file + ".tmp", JSON.stringify(validated, null, 2), {
      mode: 0o600,
    });
    await fs.rename(this.file + ".tmp", this.file);
    this.value = validated;
    return structuredClone(validated);
  }
}
module.exports = { defaults, validateSettings, SettingsStore };
