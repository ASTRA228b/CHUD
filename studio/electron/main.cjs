const { app, BrowserWindow, dialog, ipcMain, Menu } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawn } = require("node:child_process");
const { SettingsStore } = require("./settings.cjs");
const { DiscordPresence } = require("./discord.cjs");
const { Assistant } = require("./assistant.cjs");

const root = path.resolve(__dirname, "../..");
const workspaceArgument = process.argv
  .find((a) => a.startsWith("--workspace="))
  ?.slice("--workspace=".length);
let window,
  store,
  workspace = workspaceArgument
    ? path.resolve(workspaceArgument)
    : path.join(root, "examples/HelloWorld"),
  projectName = "HelloCHUD";
let activeFile = "",
  mode = "Idle",
  running = null,
  closeApproved = false;
const presence = new DiscordPresence(
  process.argv.includes("--chud-test-mode") &&
  process.env.CHUD_DISCORD_TEST_PIPE
    ? { paths: [process.env.CHUD_DISCORD_TEST_PIPE] }
    : {},
);
const assistant = new Assistant();
const send = (channel, data) => {
  if (window && !window.isDestroyed())
    window.webContents.send(`chud:${channel}`, data);
};
const output = (text) => send("output", String(text));
const updatePresence = () =>
  presence.update({ project: projectName, file: activeFile, mode });
presence.on("status", (status) => send("presence", status));
const projectModule = () => import("../../tools/chud/project.mjs");

function within(base, candidate) {
  const relative = path.relative(base, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
async function workspacePath(relative, allowNew = false) {
  if (
    typeof relative !== "string" ||
    !relative ||
    relative.length > 1024 ||
    path.isAbsolute(relative) ||
    relative.includes("\0")
  )
    throw new Error("Invalid workspace path");
  const base = await fs.realpath(workspace),
    target = path.resolve(base, relative);
  if (!within(base, target) || !/\.(chud|toml|md|txt|json)$/i.test(target))
    throw new Error("Only text files inside the workspace can be edited");
  const canonical = allowNew
    ? path.join(await fs.realpath(path.dirname(target)), path.basename(target))
    : await fs.realpath(target);
  if (!within(base, canonical))
    throw new Error("File resolves outside the workspace");
  if (!allowNew && !(await fs.stat(canonical)).isFile())
    throw new Error("Expected a regular file");
  return canonical;
}
async function files() {
  let count = 0;
  const walk = async (directory, depth = 0) => {
    if (depth > 8) return [];
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const result = [];
    for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (++count > 3000) break;
      if (
        e.isSymbolicLink() ||
        ["node_modules", ".git", ".chud", "build", "dist", ".tools"].includes(
          e.name,
        )
      )
        continue;
      const full = path.join(directory, e.name);
      if (e.isDirectory())
        result.push({
          name: e.name,
          path: path.relative(workspace, full),
          children: await walk(full, depth + 1),
        });
      else if (/\.(chud|toml|md|txt|json)$/i.test(e.name))
        result.push({ name: e.name, path: path.relative(workspace, full) });
    }
    return result;
  };
  return walk(workspace);
}
async function selectWorkspace(directory) {
  const { loadProject } = await projectModule();
  const project = await loadProject(directory);
  workspace = project.directory;
  projectName = project.name;
  activeFile = "";
  mode = "Idle";
  updatePresence();
  window?.setTitle(`${projectName} — CHUD Studio`);
  return state();
}
async function state() {
  return {
    workspace,
    projectName,
    files: await files(),
    settings: structuredClone(store.value),
    presence: presence.status,
    warning: store.loadWarning || "",
  };
}
function compiler() {
  return store.value.compilerPath || path.join(root, "build/bin/chudc.exe");
}
function execute(exe, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(exe, args, {
      cwd: workspace,
      windowsHide: true,
      shell: false,
      ...options,
    });
    running = child;
    let captured = "";
    const data = (b) => {
      captured += b.toString();
      if (captured.length > 2000000) captured = captured.slice(-2000000);
      if (!options.quiet) output(b.toString());
    };
    child.stdout?.on("data", data);
    child.stderr?.on("data", data);
    child.once("error", (e) => {
      if (running === child) running = null;
      reject(e);
    });
    child.once("close", (code, signal) => {
      if (running === child) running = null;
      resolve({ code: code ?? 130, signal, output: captured });
    });
  });
}
function stopRunning() {
  const child = running;
  if (!child) return;
  if (process.platform === "win32") {
    const killer = spawn(
      "taskkill.exe",
      ["/pid", String(child.pid), "/T", "/F"],
      { windowsHide: true },
    );
    killer.on("error", () => child.kill());
  } else child.kill("SIGTERM");
}
function handle(name, fn) {
  ipcMain.handle(`chud:${name}`, async (event, data) => {
    if (
      event.sender !== window?.webContents ||
      event.senderFrame !== window.webContents.mainFrame
    )
      throw new Error("Untrusted IPC sender");
    try {
      return await fn(data);
    } catch (e) {
      throw new Error(e.message);
    }
  });
}
async function setup() {
  store = new SettingsStore(app.getPath("userData"));
  await store.load();
  const { loadProject } = await projectModule();
  const initialProject = await loadProject(workspace);
  workspace = initialProject.directory;
  projectName = initialProject.name;
  window = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 1040,
    minHeight: 680,
    backgroundColor: "#1e1e1e",
    title: "CHUD Studio",
    icon: path.join(__dirname, "../assets/chud.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.setTitle(`${projectName} — CHUD Studio`);
  const command = (label, id, accelerator) => ({
    label,
    accelerator,
    click: () => send("command", id),
  });
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "File",
        submenu: [
          command("New Project…", "newProject", "Ctrl+Shift+N"),
          command("New Source File…", "newFile", "Ctrl+N"),
          command("Open Project…", "openProject", "Ctrl+Shift+O"),
          { type: "separator" },
          command("Save", "save", "Ctrl+S"),
          command("Save All", "saveAll", "Ctrl+Shift+S"),
          { type: "separator" },
          { role: "close" },
        ],
      },
      {
        label: "Edit",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "View",
        submenu: [
          command("Find File", "findFile", "Ctrl+P"),
          command("Split Editor", "split"),
          command("Assistant", "assistant"),
          command("Output", "output"),
          command("Error List", "problems"),
          command("Terminal", "terminal"),
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
        ],
      },
      {
        label: "Build",
        submenu: [
          command("Build Project", "build", "Ctrl+Shift+B"),
          command("Check Project", "check"),
          command("Run Project", "run", "Ctrl+F5"),
          command("Stop", "stop", "Shift+F5"),
        ],
      },
      {
        label: "Tools",
        submenu: [
          command("Search Studio…", "commands", "Ctrl+Q"),
          command("Studio Settings…", "settings", "Ctrl+,"),
        ],
      },
    ]),
  );
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (e) => e.preventDefault());
  window.webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => callback(false),
  );
  handle("state", state);
  handle("files", files);
  handle("openProject", async () => {
    if (running)
      throw new Error("Stop the running process before switching projects");
    const selected = await dialog.showOpenDialog(window, {
      properties: ["openDirectory"],
      title: "Open CHUD Project",
    });
    return selected.canceled ? null : selectWorkspace(selected.filePaths[0]);
  });
  handle("createProject", async ({ name, empty = false }) => {
    if (running)
      throw new Error("Stop the running process before creating a project");
    if (typeof name !== "string" || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name))
      throw new Error(
        "Use letters, numbers, underscores or hyphens for the project name",
      );
    const selected = await dialog.showOpenDialog(window, {
      properties: ["openDirectory", "createDirectory"],
      title: "Choose the parent folder for your new project",
    });
    if (selected.canceled) return null;
    const { createProject } = await projectModule();
    const directory = path.join(selected.filePaths[0], name);
    await createProject(directory, name, Boolean(empty));
    return selectWorkspace(directory);
  });
  handle("readFile", async (relative) => {
    const file = await workspacePath(relative);
    if ((await fs.stat(file)).size > 1024 * 1024)
      throw new Error("Editor files are limited to 1 MB");
    activeFile = path.basename(file);
    mode = "Editing";
    updatePresence();
    return fs.readFile(file, "utf8");
  });
  handle("saveFile", async ({ relative, content }) => {
    if (typeof content !== "string" || Buffer.byteLength(content) > 1024 * 1024)
      throw new Error("Invalid file contents");
    const file = await workspacePath(relative);
    await fs.writeFile(file, content, "utf8");
    return true;
  });
  handle("newFile", async (relative) => {
    const file = await workspacePath(relative, true);
    await fs.writeFile(file, "", { flag: "wx" });
    return files();
  });
  handle("saveSettings", async (settings) => {
    const saved = await store.save(settings);
    presence.configure(saved.discord);
    updatePresence();
    return saved;
  });
  handle("editorContext", (relative) => {
    activeFile = typeof relative === "string" ? path.basename(relative) : "";
    if (!running) mode = activeFile ? "Editing" : "Idle";
    updatePresence();
  });
  handle("build", async ({ action, configuration }) => {
    if (
      !["build", "run", "check", "test"].includes(action) ||
      !["debug", "release"].includes(configuration)
    )
      throw new Error("Invalid build action");
    if (running) throw new Error("A process is already running");
    mode = action === "run" ? "Running" : "Building";
    updatePresence();
    output(`\n› CHUD ${action} (${configuration})\n`);
    try {
      const args = [
        path.join(root, "tools/chud/chud.mjs"),
        action,
        ...(configuration === "release" && action !== "check"
          ? ["--release"]
          : []),
      ];
      const result = await execute(process.execPath, args, {
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: "1",
          CHUD_COMPILER: compiler(),
        },
      });
      output(`\nProcess exited with code ${result.code}\n`);
      return { code: result.code };
    } finally {
      mode = activeFile ? "Editing" : "Idle";
      updatePresence();
    }
  });
  handle("stop", () => {
    stopRunning();
    return true;
  });
  handle("terminal", async (command) => {
    if (typeof command !== "string" || !command.trim() || command.length > 8000)
      throw new Error("Invalid terminal command");
    if (running) throw new Error("A process is already running");
    output(`\nPS ${projectName}> ${command}\n`);
    const result = await execute(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", command],
      {
        env: {
          ...process.env,
          PATH: `${path.join(root, "build/bin")};${process.env.PATH}`,
        },
      },
    );
    output(`\nProcess exited with code ${result.code}\n`);
    return { code: result.code };
  });
  handle("diagnostics", async ({ relative, content }) => {
    if (typeof content !== "string" || content.length > 1024 * 1024)
      throw new Error("Invalid diagnostic content");
    await workspacePath(relative);
    if (!/\.chud$/i.test(relative)) return [];
    const temporary = await fs.mkdtemp(
      path.join(app.getPath("temp"), "chud-check-"),
    );
    try {
      const file = path.join(temporary, "Document.chud");
      await fs.writeFile(file, content, "utf8");
      // Diagnostics run separately from the active build and cannot replace its process handle.
      const text = await new Promise((resolve, reject) => {
        const child = spawn(
          compiler(),
          [file, "--check", "--library", "--diagnostics-json"],
          { windowsHide: true },
        );
        let stdout = "",
          stderr = "";
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error("Compiler check timed out"));
        }, 10000);
        child.stdout.on("data", (b) => {
          stdout += b;
        });
        child.stderr.on("data", (b) => {
          stderr += b;
        });
        child.on("error", (e) => {
          clearTimeout(timer);
          reject(e);
        });
        child.on("close", () => {
          clearTimeout(timer);
          stdout.trim().startsWith("[")
            ? resolve(stdout)
            : reject(new Error(stderr || "Compiler check failed"));
        });
      });
      return JSON.parse(text).map((d) => ({ ...d, file: relative }));
    } finally {
      await fs.rm(temporary, { recursive: true, force: true });
    }
  });
  handle("assistantChat", (payload) => assistant.chat(payload, store.value));
  handle("assistantStatus", (model) => assistant.status(model, store.value));
  handle("assistantClear", (model) => assistant.clear(model, store.value));
  handle("assistantCancel", () => assistant.cancel());
  handle("confirmClose", (approved) => {
    if (approved === true) {
      closeApproved = true;
      window.close();
    }
  });
  window.on("close", (e) => {
    if (!closeApproved) {
      e.preventDefault();
      send("closeRequest", true);
    }
  });
  await window.loadFile(path.join(__dirname, "../dist/index.html"));
  presence.configure(store.value.discord);
  updatePresence();
}
app
  .whenReady()
  .then(setup)
  .catch((e) => {
    dialog.showErrorBox("CHUD Studio", e.message);
    app.quit();
  });
app.on("before-quit", () => {
  presence.dispose();
  assistant.cancel();
  stopRunning();
});
app.on("window-all-closed", () => app.quit());
