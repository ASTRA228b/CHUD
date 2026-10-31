const { fakeDiscord } = require("./helpers/discord-server.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DiscordPresence,

  activityFor,
  ipcPaths,
} = require("../electron/discord.cjs");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const settings = {
  enabled: true,
  applicationId: "123456789012345678",
  showProject: true,
  showFile: true,
  showElapsed: true,
};
const { APPLICATION_ID, LOGO_URL } = require("../electron/discord-identity.cjs");
const { defaults } = require("../electron/settings.cjs");
async function waitFor(predicate) {
  const end = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error("Timed out");
    await sleep(5);
  }
}
test("presence uses only explicitly shared basenames and limits field bytes", () => {
  const privateActivity = activityFor(
    { ...settings, showProject: false, showFile: false },
    { mode: "Editing", project: "Secret", file: "C:\\private\\Secret.chud" },
    100,
  );
  assert.deepEqual(privateActivity, {
    details: "Editing in CHUD Studio",
    instance: false,
    assets: { large_image: LOGO_URL, large_text: "CHUD Programming Language" },
    timestamps: { start: 100 },
  });
  const activity = activityFor(
    settings,
    {
      mode: "Running",
      project: "/home/name/Project",
      file: "C:\\Users\\name\\Program.chud",
    },
    100,
  );
  assert.equal(activity.state, "Project · Program.chud");
  assert.doesNotMatch(JSON.stringify(activity), /Users|home/);
  const long = activityFor(
    settings,
    { project: "🟣".repeat(60), file: "x".repeat(100) },
    100,
  );
  assert.ok(Buffer.byteLength(long.state) <= 128);
  assert.equal(ipcPaths("win32").length, 10);
  assert.match(ipcPaths("win32")[0], /discord-ipc-0$/);
});
test("real IPC transport handshakes, accepts fragmented frames, throttles, updates and clears", async () => {
  const server = await fakeDiscord({ fragment: true });
  const presence = new DiscordPresence({
    paths: [server.pipe],
    minInterval: 40,
    handshakeTimeout: 500,
  });
  try {
    presence.update({
      mode: "Editing",
      project: "Example",
      file: "Program.chud",
    });
    presence.configure(settings);
    await waitFor(() => presence.status.state === "connected");
    assert.equal(server.messages[0].v, 1);
    assert.equal(server.messages[0].client_id, settings.applicationId);
    const initial = server.messages.find((m) => m.cmd === "SET_ACTIVITY");
    assert.equal(initial.args.pid, process.pid);
    assert.equal(initial.args.activity.state, "Example · Program.chud");
    assert.deepEqual(initial.args.activity.assets, {
      large_image: LOGO_URL,
      large_text: "CHUD Programming Language",
    });
    presence.update({
      mode: "Building",
      project: "Example",
      file: "Next.chud",
    });
    presence.update({
      mode: "Running",
      project: "Example",
      file: "Final.chud",
    });
    await waitFor(
      () => server.messages.filter((m) => m.cmd === "SET_ACTIVITY").length >= 2,
    );
    assert.equal(
      server.messages.filter((m) => m.cmd === "SET_ACTIVITY").at(-1).args
        .activity.details,
      "Running in CHUD Studio",
    );
    presence.configure({ ...settings, enabled: false });
    await waitFor(() =>
      server.messages.some(
        (m) => m.cmd === "SET_ACTIVITY" && m.args.activity === null,
      ),
    );
    assert.equal(presence.status.state, "disabled");
    const count = server.messages.length;
    presence.update({ mode: "Editing" });
    await sleep(70);
    assert.equal(server.messages.length, count);
  } finally {
    presence.dispose();
    await server.close();
  }
});
test("missing Discord retries automatically and recovers when a desktop pipe becomes available", async () => {
  const server = await fakeDiscord();
  const presence = new DiscordPresence({
    paths: [server.pipe + "-missing"],
    retryDelay: 20,
    minInterval: 0,
  });
  try {
    presence.configure(settings);
    await waitFor(() => presence.status.state === "retrying");
    presence.paths = [server.pipe];
    await waitFor(() => presence.status.state === "connected");
  } finally {
    presence.dispose();
    await server.close();
  }
});
test("Discord errors and malformed responses never report a connected state", async () => {
  for (const options of [{ reject: true }, { invalid: true }]) {
    const server = await fakeDiscord(options);
    const presence = new DiscordPresence({
      paths: [server.pipe],
      retryDelay: 10000,
    });
    try {
      presence.configure(settings);
      await waitFor(() => presence.status.state === "retrying");
      assert.notEqual(presence.status.state, "connected");
    } finally {
      presence.dispose();
      await server.close();
    }
  }
});
test("disabled presence never attempts a connection", () => {
  const presence = new DiscordPresence({
    connect: () => {
      throw new Error("Must not connect");
    },
  });
  presence.configure({ ...settings, enabled: false });
  presence.update({ mode: "Editing" });
  assert.equal(presence.status.state, "disabled");
  presence.dispose();
});
test("normal toggle connects using CHUD Studio's built-in application ID", async () => {
  const server = await fakeDiscord();
  const presence = new DiscordPresence({
    paths: [server.pipe],
    minInterval: 0,
  });
  try {
    presence.configure({ ...defaults.discord, enabled: true });
    await waitFor(() => presence.status.state === "connected");
    assert.equal(server.messages[0].client_id, APPLICATION_ID);
    assert.equal(
      server.messages.find((m) => m.cmd === "SET_ACTIVITY").args.activity.state,
      undefined,
    );
    presence.configure({
      ...defaults.discord,
      enabled: true,
      useCustomApplication: true,
      applicationId: settings.applicationId,
    });
    await waitFor(
      () =>
        presence.status.state === "connected" &&
        server.messages.some((m) => m.client_id === settings.applicationId),
    );
  } finally {
    presence.dispose();
    await server.close();
  }
});
test("reducing sharing clears published names immediately and reconnects privately", async () => {
  const server = await fakeDiscord();
  const presence = new DiscordPresence({
    paths: [server.pipe],
    minInterval: 60000,
  });
  try {
    presence.update({
      mode: "Editing",
      project: "PrivateProject",
      file: "Secret.chud",
    });
    presence.configure(settings);
    await waitFor(() => presence.status.state === "connected");
    presence.configure({ ...settings, showProject: false, showFile: false });
    await waitFor(() =>
      server.messages.some(
        (m) => m.cmd === "SET_ACTIVITY" && m.args.activity === null,
      ),
    );
    await waitFor(() => presence.status.state === "connected");
    const last = server.messages.filter((m) => m.cmd === "SET_ACTIVITY").at(-1);
    assert.equal(last.args.activity.state, undefined);
  } finally {
    presence.dispose();
    await server.close();
  }
});
