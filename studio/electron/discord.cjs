const net = require("node:net");
const path = require("node:path");
const os = require("node:os");
const { randomUUID } = require("node:crypto");
const { EventEmitter } = require("node:events");
const { applicationIdFor, LOGO_URL } = require("./discord-identity.cjs");

const MAX_FRAME = 1024 * 1024;
function frame(opcode, payload) {
  const data = Buffer.isBuffer(payload)
    ? payload
    : Buffer.from(JSON.stringify(payload), "utf8");
  const head = Buffer.alloc(8);
  head.writeUInt32LE(opcode, 0);
  head.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, data]);
}
function ipcPaths(platform = process.platform, env = process.env) {
  return Array.from({ length: 10 }, (_, i) =>
    platform === "win32"
      ? `\\\\.\\pipe\\discord-ipc-${i}`
      : path.join(
          env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || os.tmpdir(),
          `discord-ipc-${i}`,
        ),
  );
}
function safeName(value) {
  if (typeof value !== "string") return "";
  let s = value
    .split(/[\\/]/)
    .pop()
    .replace(/[\x00-\x1f\x7f]/g, "")
    .trim();
  while (Buffer.byteLength(s, "utf8") > 100) s = [...s].slice(0, -1).join("");
  return s;
}
function activityFor(settings, context, startedAt) {
  const mode = ["Editing", "Building", "Running"].includes(context.mode)
    ? context.mode
    : "Idle";
  const activity = {
    details: `${mode} in CHUD Studio`,
    instance: false,
    assets: { large_image: LOGO_URL, large_text: "CHUD Programming Language" },
  };
  const names = [];
  if (settings.showProject && safeName(context.project))
    names.push(safeName(context.project));
  if (settings.showFile && safeName(context.file))
    names.push(safeName(context.file));
  if (names.length) {
    let state = names.join(" · ");
    while (Buffer.byteLength(state, "utf8") > 128)
      state = [...state].slice(0, -1).join("");
    activity.state = state;
  }
  if (settings.showElapsed) activity.timestamps = { start: startedAt };
  return activity;
}
class DiscordPresence extends EventEmitter {
  constructor({
    paths = ipcPaths(),
    connect = (options) => net.createConnection(options),
    minInterval = 15000,
    retryDelay = 2000,
    handshakeTimeout = 5000,
  } = {}) {
    super();
    Object.assign(this, {
      paths,
      connect,
      minInterval,
      retryDelay,
      handshakeTimeout,
    });
    this.settings = { enabled: false };
    this.context = {};
    this.startedAt = Math.floor(Date.now() / 1000);
    this.status = {
      state: "disabled",
      message: "Discord Rich Presence is off",
    };
    this.generation = 0;
    this.attempt = 0;
    this.lastSent = 0;
    this.lastPayload = "";
    this.ready = false;
  }
  setStatus(state, message) {
    this.status = { state, message };
    this.emit("status", this.status);
  }
  configure(settings) {
    settings = { ...settings, applicationId: applicationIdFor(settings) };
    const lessSharing = ["showProject", "showFile", "showElapsed"].some(
      (key) => this.settings[key] && !settings[key],
    );
    const reconnect =
      this.settings.enabled !== settings.enabled ||
      this.settings.applicationId !== settings.applicationId ||
      lessSharing;
    this.settings = { ...settings };
    if (reconnect) {
      this.disconnect(true);
      this.attempt = 0;
      if (!settings.enabled)
        return this.setStatus("disabled", "Discord Rich Presence is off");
      if (!/^\d{17,20}$/.test(settings.applicationId || ""))
        return this.setStatus(
          "error",
          "A valid Discord application ID is required",
        );
      this.open();
    } else if (settings.enabled) this.schedule();
  }
  update(context) {
    this.context = { ...context };
    if (this.settings.enabled) this.schedule();
  }
  disconnect(clear = true) {
    ++this.generation;
    clearTimeout(this.retryTimer);
    clearTimeout(this.sendTimer);
    clearTimeout(this.handshakeTimer);
    const socket = this.socket;
    const wasReady = this.ready;
    this.socket = null;
    this.ready = false;
    this.inflight = null;
    this.lastPayload = "";
    this.lastSent = 0;
    if (socket) {
      if (clear && wasReady && !socket.destroyed) {
        socket.end(
          frame(1, {
            cmd: "SET_ACTIVITY",
            args: { pid: process.pid, activity: null },
            nonce: randomUUID(),
          }),
        );
        const timer = setTimeout(() => socket.destroy(), 500);
        timer.unref();
      } else socket.destroy();
    }
  }
  open() {
    if (!this.settings.enabled) return;
    const generation = this.generation;
    this.setStatus("connecting", "Connecting to Discord desktop…");
    const tryPath = (index) => {
      if (generation !== this.generation || !this.settings.enabled) return;
      if (index >= this.paths.length)
        return this.retry(
          "Discord desktop is unavailable; retrying automatically",
        );
      let socket;
      try {
        socket = this.connect({ path: this.paths[index] });
      } catch {
        return tryPath(index + 1);
      }
      this.socket = socket;
      let connected = false,
        failed = false,
        buffer = Buffer.alloc(0);
      const fail = (message) => {
        if (failed || generation !== this.generation) return;
        failed = true;
        clearTimeout(this.handshakeTimer);
        clearTimeout(this.sendTimer);
        this.ready = false;
        this.inflight = null;
        socket.destroy();
        if (this.socket === socket) this.socket = null;
        if (!connected) tryPath(index + 1);
        else this.retry(message);
      };
      socket.on("error", () =>
        fail("Discord connection closed; retrying automatically"),
      );
      socket.on("close", () =>
        fail("Discord connection closed; retrying automatically"),
      );
      this.handshakeTimer = setTimeout(
        () => fail("Discord did not respond; retrying automatically"),
        this.handshakeTimeout,
      );
      this.handshakeTimer.unref?.();
      socket.on("connect", () => {
        if (generation !== this.generation) return socket.destroy();
        connected = true;
        socket.write(
          frame(0, { v: 1, client_id: this.settings.applicationId }),
        );
      });
      socket.on("data", (chunk) => {
        if (generation !== this.generation || failed) return;
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 8) {
          const opcode = buffer.readUInt32LE(0),
            length = buffer.readUInt32LE(4);
          if (length > MAX_FRAME) return fail("Discord sent an invalid frame");
          if (buffer.length < length + 8) return;
          const data = buffer.subarray(8, 8 + length);
          buffer = buffer.subarray(8 + length);
          if (opcode === 3) {
            socket.write(frame(4, data));
            continue;
          }
          if (opcode === 2)
            return fail(
              "Discord closed the connection; check the application ID",
            );
          if (opcode !== 1) continue;
          let message;
          try {
            message = JSON.parse(data.toString("utf8"));
          } catch {
            return fail("Discord sent invalid JSON");
          }
          if (!message || typeof message !== "object")
            return fail("Discord sent an invalid response");
          if (message.evt === "ERROR")
            return fail(
              "Discord rejected Rich Presence; check the application ID",
            );
          if (message.evt === "READY") {
            clearTimeout(this.handshakeTimer);
            this.ready = true;
            this.attempt = 0;
            this.lastSent = 0;
            this.lastPayload = "";
            this.schedule();
          } else if (
            message.cmd === "SET_ACTIVITY" &&
            message.nonce === this.inflight
          ) {
            clearTimeout(this.handshakeTimer);
            this.inflight = null;
            this.setStatus("connected", "Connected to Discord");
            this.schedule();
          }
        }
      });
    };
    tryPath(0);
  }
  retry(message) {
    if (!this.settings.enabled) return;
    this.setStatus("retrying", message);
    clearTimeout(this.retryTimer);
    const delay = Math.min(
      30000,
      this.retryDelay * 2 ** Math.min(this.attempt++, 4),
    );
    const generation = this.generation;
    this.retryTimer = setTimeout(() => {
      if (generation === this.generation) this.open();
    }, delay);
    this.retryTimer.unref?.();
  }
  schedule() {
    clearTimeout(this.sendTimer);
    if (!this.settings.enabled || !this.ready || !this.socket || this.inflight)
      return;
    const activity = activityFor(this.settings, this.context, this.startedAt);
    const serialized = JSON.stringify(activity);
    if (serialized === this.lastPayload) return;
    const delay = Math.max(0, this.minInterval - (Date.now() - this.lastSent));
    if (delay) {
      this.sendTimer = setTimeout(() => this.schedule(), delay);
      this.sendTimer.unref?.();
      return;
    }
    this.inflight = randomUUID();
    this.lastPayload = serialized;
    this.lastSent = Date.now();
    this.socket.write(
      frame(1, {
        cmd: "SET_ACTIVITY",
        args: { pid: process.pid, activity },
        nonce: this.inflight,
      }),
    );
    const generation = this.generation;
    this.handshakeTimer = setTimeout(() => {
      if (generation !== this.generation || !this.inflight) return;
      this.socket?.destroy();
    }, this.handshakeTimeout);
    this.handshakeTimer.unref?.();
  }
  dispose() {
    this.settings.enabled = false;
    this.disconnect(true);
    this.setStatus("disabled", "Discord Rich Presence is off");
  }
}
module.exports = { DiscordPresence, frame, ipcPaths, activityFor };
