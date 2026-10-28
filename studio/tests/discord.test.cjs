const test = require("node:test");
const assert = require("node:assert/strict");
const net = require("node:net");
const path = require("node:path");
const os = require("node:os");
const { once } = require("node:events");
const {
  DiscordPresence,
  frame,
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
async function waitFor(predicate) {
  const end = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error("Timed out");
    await sleep(5);
  }
}
async function fakeDiscord({
  reject = false,
  fragment = false,
  invalid = false,
} = {}) {
  const pipe =
    process.platform === "win32"
      ? `\\\\.\\pipe\\chud-test-${process.pid}-${Math.random()}`
      : path.join(
          os.tmpdir(),
          `chud-test-${process.pid}-${Math.random()}.sock`,
        );
  const messages = [],
    sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const op = buffer.readUInt32LE(0),
          size = buffer.readUInt32LE(4);
        if (buffer.length < size + 8) break;
        const message = JSON.parse(buffer.subarray(8, 8 + size).toString());
        buffer = buffer.subarray(8 + size);
        messages.push({ op, ...message });
        let reply;
        if (op === 0)
          reply = frame(
            1,
            invalid ? null : { cmd: "DISPATCH", evt: "READY", data: {} },
          );
        else if (message.cmd === "SET_ACTIVITY" && !socket.writableEnded)
          reply = frame(1, {
            cmd: "SET_ACTIVITY",
            evt: reject ? "ERROR" : null,
            nonce: message.nonce,
            data: {},
          });
        if (reply && !socket.destroyed) {
          if (fragment) {
            socket.write(reply.subarray(0, 5));
            setTimeout(() => {
              if (!socket.destroyed) socket.write(reply.subarray(5));
            }, 2);
          } else socket.write(reply);
        }
      }
    });
  });
  server.listen(pipe);
  await once(server, "listening");
  return {
    pipe,
    messages,
    sockets,
    close: async () => {
      for (const s of sockets) s.destroy();
      server.close();
      await once(server, "close");
    },
  };
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
