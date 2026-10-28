const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const {
  defaults,
  validateSettings,
  SettingsStore,
} = require("../electron/settings.cjs");
test("Discord setting defaults off and persists through app restarts", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "chud-settings-"));
  try {
    const store = new SettingsStore(dir);
    const initial = await store.load();
    assert.equal(initial.discord.enabled, false);
    assert.equal(initial.discord.showProject, false);
    assert.equal(initial.discord.showFile, false);
    await store.save({
      ...initial,
      discord: {
        ...initial.discord,
        enabled: true,
        useCustomApplication: true,
        applicationId: "123456789012345678",
        showFile: true,
      },
    });
    const reopened = await new SettingsStore(dir).load();
    assert.equal(reopened.discord.enabled, true);
    assert.equal(reopened.discord.showFile, true);
    await assert.rejects(
      store.save({
        ...initial,
        discord: {
          ...initial.discord,
          enabled: true,
          useCustomApplication: true,
          applicationId: "wrong",
        },
      }),
      /application ID/,
    );
    assert.equal((await new SettingsStore(dir).load()).discord.enabled, true);
  } finally {
    await fs.rm(dir, { force: true, recursive: true });
  }
});
test("settings reject unsafe URLs, invalid IDs and malformed types", () => {
  assert.throws(
    () => validateSettings({ ...defaults, mainBaseUrl: "http://example.com" }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      validateSettings({
        ...defaults,
        discord: { ...defaults.discord, enabled: "yes" },
      }),
    /enabled/,
  );
  assert.throws(
    () =>
      validateSettings({
        ...defaults,
        discord: {
          ...defaults.discord,
          useCustomApplication: true,
          applicationId: "bot-token",
        },
      }),
    /application ID/,
  );
  assert.throws(
    () => validateSettings({ ...defaults, fontSize: 100 }),
    /Font size/,
  );
  assert.equal(
    validateSettings({ ...defaults, mainBaseUrl: "http://localhost:8000" })
      .mainBaseUrl,
    "http://localhost:8000",
  );
});
test("shared identity allows enabling without an ID and preserves legacy custom settings", () => {
  const standard = validateSettings({
    ...defaults,
    discord: { ...defaults.discord, enabled: true },
  });
  assert.equal(standard.discord.enabled, true);
  assert.equal(standard.discord.useCustomApplication, false);
  assert.equal(standard.discord.applicationId, "");
  const legacy = validateSettings({
    discord: { enabled: true, applicationId: "123456789012345678" },
  });
  assert.equal(legacy.discord.useCustomApplication, true);
  const cleared = validateSettings({
    ...defaults,
    discord: {
      ...defaults.discord,
      enabled: true,
      applicationId: "old-invalid-value",
    },
  });
  assert.equal(cleared.discord.useCustomApplication, false);
});
