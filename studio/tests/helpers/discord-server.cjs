const net = require("node:net");
const path = require("node:path");
const os = require("node:os");
const { once } = require("node:events");
const { frame } = require("../../electron/discord.cjs");

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

module.exports = { fakeDiscord };
