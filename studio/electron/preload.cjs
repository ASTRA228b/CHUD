const { contextBridge, ipcRenderer } = require("electron");
const methods = [
  "state",
  "openProject",
  "createProject",
  "files",
  "readFile",
  "saveFile",
  "newFile",
  "saveSettings",
  "build",
  "stop",
  "terminal",
  "diagnostics",
  "assistantChat",
  "assistantStatus",
  "assistantClear",
  "assistantCancel",
  "editorContext",
  "confirmClose",
];
const api = {};
for (const method of methods)
  api[method] = (payload) => ipcRenderer.invoke(`chud:${method}`, payload);
for (const [method, channel] of [
  ["onOutput", "output"],
  ["onPresence", "presence"],
  ["onCloseRequest", "closeRequest"],
]) {
  api[method] = (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on(`chud:${channel}`, listener);
    return () => ipcRenderer.removeListener(`chud:${channel}`, listener);
  };
}
contextBridge.exposeInMainWorld("chud", api);
