import { _electron as electron, expect } from "@playwright/test";
import electronPath from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createProject } from "../../tools/chud/project.mjs";
import { fakeDiscord } from "../tests/helpers/discord-server.cjs";
import { defaults } from "../electron/settings.cjs";
import { LOGO_URL } from "../electron/discord-identity.cjs";

const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "chud-lifecycle-"));
const workspace = path.join(temporary, "CloseTest"),
  profile = path.join(temporary, "profile");
await createProject(workspace);
await fs.mkdir(profile);
await fs.writeFile(
  path.join(profile, "settings.json"),
  JSON.stringify({
    ...defaults,
    discord: { ...defaults.discord, enabled: true },
  }),
);
const server = await fakeDiscord();
const env = { ...process.env, CHUD_DISCORD_TEST_PIPE: server.pipe };
delete env.ELECTRON_RUN_AS_NODE;
const args = [
  studio,
  "--chud-test-mode",
  `--workspace=${workspace}`,
  `--user-data-dir=${profile}`,
];
let app, appProcess, follower;
try {
  app = await electron.launch({
    executablePath: electronPath,
    args,
    env,
    timeout: 30000,
  });
  appProcess = app.process();
  const page = await app.firstWindow();
  await page.locator(".monaco-editor").first().waitFor();
  await expect
    .poll(
      () =>
        server.messages.filter(
          (m) => m.cmd === "SET_ACTIVITY" && m.args.activity,
        ).length,
    )
    .toBeGreaterThan(0);
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].isVisible(),
    ),
    true,
  );
  assert.equal(
    server.messages.find((m) => m.cmd === "SET_ACTIVITY" && m.args.activity)
      .args.activity.assets.large_image,
    LOGO_URL,
  );

  follower = spawn(electronPath, args, {
    env,
    windowsHide: true,
    stdio: "ignore",
  });
  const duplicateExit = await Promise.race([
    once(follower, "exit"),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Duplicate Studio did not exit")),
        10000,
      ).unref(),
    ),
  ]);
  assert.equal(duplicateExit[0], 0);
  assert.equal(
    await app.evaluate(
      ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
    ),
    1,
  );

  const input = page.locator(".monaco-editor textarea.inputarea").first();
  await input.focus();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText("\n// Unsaved close regression\n");
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].close(),
  );
  await expect(
    page.getByRole("heading", { name: "Save your changes?", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.ok(
    !server.messages.some(
      (m) => m.cmd === "SET_ACTIVITY" && m.args.activity === null,
    ),
  );

  const exited = once(appProcess, "exit");
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].close(),
  );
  await page
    .getByRole("button", { name: "Save and close", exact: true })
    .click();
  const result = await Promise.race([
    exited,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Studio stayed alive after closing")),
        10000,
      ).unref(),
    ),
  ]);
  assert.equal(result[0], 0);
  assert.ok(
    server.messages.some(
      (m) => m.cmd === "SET_ACTIVITY" && m.args.activity === null,
    ),
  );
  assert.match(
    await fs.readFile(path.join(workspace, "src/Program.chud"), "utf8"),
    /Unsaved close regression/,
  );
  await expect.poll(() => server.sockets.size).toBe(0);
  console.log(
    "Lifecycle passed: visible window, one instance, logo payload, cancel keeps presence, save-and-close clears presence and exits with no IPC socket.",
  );
} finally {
  if (follower && follower.exitCode === null) follower.kill();
  if (app && appProcess?.exitCode === null) {
    await app
      .evaluate(({ BrowserWindow }) => {
        for (const win of BrowserWindow.getAllWindows()) win.destroy();
      })
      .catch(() => {});
    await app.close().catch(() => {});
  }
  await server.close();
  await fs.rm(temporary, { recursive: true, force: true });
}
