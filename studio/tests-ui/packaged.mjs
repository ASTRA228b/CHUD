import { _electron as electron, expect } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const executablePath = process.env.CHUD_STUDIO_EXECUTABLE;
if (!executablePath) throw new Error("Set CHUD_STUDIO_EXECUTABLE to the installed Studio executable");
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "chud-installed-"));
let studio;
try {
  studio = await electron.launch({
    executablePath,
    args: [`--user-data-dir=${profile}`],
    timeout: 30000,
  });
  const page = await studio.firstWindow();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.locator(".monaco-editor").first().waitFor();
  await expect(page.getByRole("tab", { name: "Basic assistant", exact: true })).toBeVisible();
  await fs.access(path.join(profile, "HelloCHUD/src/Program.chud"));
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  const output = page.getByLabel("Process output");
  await expect(output).toContainText("Process exited with code 0", { timeout: 45000 });
  await expect(output).toContainText("Hello from CHUD!");
  await page.getByRole("button", { name: "Terminal", exact: true }).click();
  const windows = process.platform === "win32";
  await page.getByLabel(windows ? "PowerShell command" : "Shell command").fill(
    windows ? 'Write-Output "Installed Studio shell"' : 'printf "%s\\n" "Installed Studio shell"',
  );
  await page.getByRole("button", { name: "Execute", exact: true }).click();
  await expect(output).toHaveText(/\nInstalled Studio shell\r?\n/);
  assert.deepEqual(errors, []);
  console.log("Installed Studio opened and ran a native HelloCHUD project and shell command.");
} finally {
  if (studio) {
    await studio.evaluate(({ BrowserWindow }) => {
      for (const window of BrowserWindow.getAllWindows()) window.destroy();
    });
    await studio.close();
  }
  await fs.rm(profile, { recursive: true, force: true });
}
