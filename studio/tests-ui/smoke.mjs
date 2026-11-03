import { _electron as electron, expect } from "@playwright/test";
import electronPath from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createProject } from "../../tools/chud/project.mjs";
import { fakeDiscord } from "../tests/helpers/discord-server.cjs";
import { APPLICATION_ID } from "../electron/discord-identity.cjs";

const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "chud-studio-ui-"));
const workspace = path.join(temporary, "StudioTest");
await createProject(workspace);
const env = { ...process.env };
const discord = await fakeDiscord();
env.CHUD_DISCORD_TEST_PIPE = discord.pipe;
delete env.ELECTRON_RUN_AS_NODE;
let app, page;
const errors = [];
try {
  app = await electron.launch({
    executablePath: electronPath,
    args: [
      studio,
      "--chud-test-mode",
      `--workspace=${workspace}`,
      `--user-data-dir=${path.join(temporary, "profile")}`,
    ],
    env,
    timeout: 30000,
  });
  page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.stack || e.message));
  await page
    .getByRole("button", { name: "Run", exact: false })
    .first()
    .waitFor();
  await page.locator(".monaco-editor").first().waitFor();
  await expect(
    page.getByRole("tab", { name: "Basic assistant", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const originalStarterFile = await fs.readFile(
    path.join(workspace, "src/Program.chud"),
    "utf8",
  );
  const modelRequests = [];
  page.on("request", (request) => {
    if (/chudgpt.*vercel\.app/.test(request.url()))
      modelRequests.push(request.url());
  });
  await page
    .getByLabel("Starter template", { exact: true })
    .selectOption("counter");
  await expect(page.getByLabel("Starter source preview")).toContainText(
    "CHUD.GUI.BeginFrame",
  );
  await page.getByLabel("Program title or greeting").fill('My "CHUD" window');
  await page
    .getByRole("button", { name: "Review replacement", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Review replacement/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  assert.equal(
    await fs.readFile(path.join(workspace, "src/Program.chud"), "utf8"),
    originalStarterFile,
  );
  await page
    .getByRole("tab", { name: "Library reference", exact: true })
    .click();
  await page.getByLabel("Search libraries").fill("GUILayout");
  await expect(
    page.getByRole("button", {
      name: "Copy CHUD.GUILayout.Slider",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("tab", { name: "Starter programs", exact: true })
    .click();
  await page
    .getByLabel("Starter template", { exact: true })
    .selectOption("hello");
  await page.getByLabel("Program title or greeting").fill("Hello from CHUD!");
  await page
    .getByRole("button", { name: "Review replacement", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve and apply", exact: true })
    .click();
  await page.keyboard.press("Control+s");
  await expect
    .poll(() => fs.readFile(path.join(workspace, "src/Program.chud"), "utf8"))
    .toContain("Hello from CHUD!");
  await page
    .getByLabel("New file path", { exact: true })
    .fill("src/Starter.chud");
  await page
    .getByRole("button", { name: "Create new source file", exact: true })
    .click();
  await expect
    .poll(() => fs.readFile(path.join(workspace, "src/Starter.chud"), "utf8"))
    .toContain("Hello from CHUD!");
  await expect(page.locator(".basic-message")).toHaveText(
    "Created starter file.",
  );
  await page
    .getByRole("button", { name: "Create new source file", exact: true })
    .click();
  await expect(page.locator(".basic-message")).toContainText("EEXIST");
  assert.match(
    await fs.readFile(path.join(workspace, "src/Starter.chud"), "utf8"),
    /Hello from CHUD!/,
  );
  await page
    .getByRole("button", { name: "Close Starter.chud", exact: true })
    .click();
  await fs.unlink(path.join(workspace, "src/Starter.chud"));
  await page.getByTitle("Refresh files", { exact: true }).click();
  assert.deepEqual(
    modelRequests,
    [],
    "Basic assistant must not call model endpoints",
  );
  await page.getByRole("tab", { name: "ChudGPT AI", exact: true }).click();
  await expect(page.getByLabel("ChudGPT model")).toBeVisible();
  await page.getByRole("tab", { name: "Basic assistant", exact: true }).click();
  await page.getByRole("button", { name: /Search Studio/ }).click();
  await page
    .getByLabel("Search commands", { exact: true })
    .fill("View: Terminal");
  await page.getByLabel("Search commands", { exact: true }).press("Enter");
  await expect(page.getByLabel("PowerShell command")).toBeVisible();
  await page.getByRole("button", { name: "Output", exact: true }).click();
  await page.getByTitle("Settings (Ctrl+,)", { exact: true }).click();
  await page.getByRole("heading", { name: "Studio settings" }).waitFor();
  const toggle = page.getByRole("switch", {
    name: "Enable Discord Rich Presence",
  });
  assert.equal(await toggle.isChecked(), false);
  await expect(
    page.getByLabel("Custom application ID", { exact: true }),
  ).toHaveCount(0);
  await toggle.check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Studio settings" })
    .waitFor({ state: "hidden" });
  await expect
    .poll(() => discord.messages.some((m) => m.client_id === APPLICATION_ID))
    .toBe(true);
  await page.getByTitle("Settings (Ctrl+,)", { exact: true }).click();
  await expect(page.locator(".connection")).toHaveText("Connected to Discord");
  assert.equal(await toggle.isChecked(), true);
  await page.getByText("Advanced Discord options", { exact: true }).click();
  await page
    .getByLabel("Use a custom Discord application", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "custom Discord application ID" })
    .waitFor();
  await page
    .getByLabel("Use a custom Discord application", { exact: true })
    .uncheck();
  await toggle.uncheck();
  await page.getByLabel("Share active filename", { exact: true }).check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Studio settings" })
    .waitFor({ state: "hidden" });
  await page.getByTitle("Settings (Ctrl+,)", { exact: true }).click();
  assert.equal(
    await page.getByLabel("Share active filename", { exact: true }).isChecked(),
    true,
  );
  await page.locator(".settings-body").evaluate((element) => {
    element.scrollTop = 350;
  });
  await page.screenshot({
    path: path.join(studio, "../build/studio-settings.png"),
  });
  await page
    .getByRole("button", { name: "Close settings", exact: true })
    .click();
  assert.equal(
    await page.evaluate(async () => {
      try {
        await window.chud.readFile("../outside.md");
        return false;
      } catch {
        return true;
      }
    }),
    true,
  );
  const input = page.locator(".monaco-editor textarea.inputarea").first();
  await input.focus();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText("\n// Studio editor save test\n");
  await page.keyboard.press("Control+s");
  const sourcePath = path.join(workspace, "src/Program.chud");
  await expect
    .poll(() => fs.readFile(sourcePath, "utf8"))
    .toContain("// Studio editor save test");
  const validSource = await fs.readFile(sourcePath, "utf8");
  await input.focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(
    validSource.replace("return 0;", "return false;"),
  );
  await page.keyboard.press("Control+s");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await expect(page.getByLabel("Process output")).toContainText(
    "Build failed.",
    { timeout: 30000 },
  );
  assert.doesNotMatch(
    await page.getByLabel("Process output").innerText(),
    /Build succeeded/,
  );
  await input.focus();
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText(validSource);
  await page.keyboard.press("Control+s");
  await page.getByRole("button", { name: "Clear output", exact: true }).click();
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await page
    .getByLabel("Process output")
    .filter({ hasText: "Hello from CHUD!" })
    .waitFor({ timeout: 30000 });
  await page
    .getByLabel("Process output")
    .filter({ hasText: "Process exited with code 0" })
    .waitFor();
  const terminalTab = page.getByRole("button", {
    name: "Terminal",
    exact: true,
  });
  await terminalTab.click();
  await page
    .getByLabel("PowerShell command")
    .fill('Write-Output "CHUD terminal integration"');
  await page.getByRole("button", { name: "Execute", exact: true }).click();
  await page
    .getByLabel("Process output")
    .filter({ hasText: /\nCHUD terminal integration\r?\n/ })
    .waitFor({ timeout: 30000 });
  await expect
    .poll(
      async () =>
        (
          (await page.getByLabel("Process output").innerText()).match(
            /Process exited with code 0/g,
          ) || []
        ).length,
    )
    .toBe(2);
  await page.getByLabel("PowerShell command").waitFor({ state: "visible" });
  await page.getByRole("button", { name: "Output", exact: true }).click();
  await page.screenshot({ path: path.join(studio, "../build/studio.png") });
  assert.deepEqual(errors, []);
  const saved = JSON.parse(
    await fs.readFile(path.join(temporary, "profile/settings.json"), "utf8"),
  );
  assert.equal(saved.discord.enabled, false);
  assert.equal(saved.discord.useCustomApplication, false);
  assert.equal(saved.discord.showFile, true);
  console.log(
    "Studio UI passed: Basic assistant templates/preview/diff, no model requests, library reference, command search, AI mode, edit/save, path protection, settings validation and persistence, failed builds, native Run, PowerShell output, no page errors.",
  );
} catch (e) {
  if (page) {
    console.error(await page.locator("body").innerText());
    await page.screenshot({
      path: path.join(studio, "../build/studio-failure.png"),
    });
  }
  throw e;
} finally {
  if (app) {
    await app.evaluate(({ BrowserWindow }) => {
      for (const win of BrowserWindow.getAllWindows()) win.destroy();
    });
    await app.close();
  }
  await discord.close();
  await fs.rm(temporary, { recursive: true, force: true });
}
