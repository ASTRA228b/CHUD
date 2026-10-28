import { _electron as electron, expect } from "@playwright/test";
import electronPath from "electron";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createProject } from "../../tools/chud/project.mjs";

const studio = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "chud-studio-ui-"));
const workspace = path.join(temporary, "StudioTest");
await createProject(workspace);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
let app, page;
const errors = [];
try {
  app = await electron.launch({
    executablePath: electronPath,
    args: [
      studio,
      `--workspace=${workspace}`,
      `--user-data-dir=${path.join(temporary, "profile")}`,
    ],
    env,
    timeout: 30000,
  });
  page = await app.firstWindow();
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("button", { name: "Run", exact: false })
    .first()
    .waitFor();
  await page.locator(".monaco-editor").first().waitFor();
  await page.getByTitle("Settings (Ctrl+,)", { exact: true }).click();
  await page.getByRole("heading", { name: "Studio settings" }).waitFor();
  const toggle = page.getByRole("switch", {
    name: "Enable Discord Rich Presence",
  });
  assert.equal(await toggle.isChecked(), false);
  await toggle.check();
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page.getByRole("alert").filter({ hasText: "application ID" }).waitFor();
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
  assert.equal(saved.discord.showFile, true);
  console.log(
    "Studio UI passed: edit/save, path protection, settings validation and persistence, failed builds, native Run, PowerShell output, no page errors.",
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
  await fs.rm(temporary, { recursive: true, force: true });
}
