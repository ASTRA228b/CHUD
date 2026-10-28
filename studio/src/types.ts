export interface DiscordSettings {
  enabled: boolean;
  useCustomApplication: boolean;
  applicationId: string;
  showProject: boolean;
  showFile: boolean;
  showElapsed: boolean;
}
export interface Settings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  autosave: boolean;
  compilerPath: string;
  configuration: "debug" | "release";
  assistantModel: string;
  mainBaseUrl: string;
  publicBaseUrl: string;
  requestTimeout: number;
  discord: DiscordSettings;
}
export interface Entry {
  name: string;
  path: string;
  children?: Entry[];
}
export interface Presence {
  state: string;
  message: string;
}
export interface State {
  workspace: string;
  projectName: string;
  files: Entry[];
  settings: Settings;
  presence: Presence;
  warning: string;
}
export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  length: number;
  message: string;
}
export interface Document {
  path: string;
  content: string;
  saved: string;
}
export interface Message {
  role: "user" | "assistant";
  content: string;
}
export interface ChudAPI {
  state(): Promise<State>;
  openProject(): Promise<State | null>;
  createProject(data: { name: string; empty: boolean }): Promise<State | null>;
  files(): Promise<Entry[]>;
  readFile(path: string): Promise<string>;
  saveFile(data: { relative: string; content: string }): Promise<boolean>;
  newFile(path: string): Promise<Entry[]>;
  saveSettings(settings: Settings): Promise<Settings>;
  build(data: {
    action: string;
    configuration: string;
  }): Promise<{ code: number }>;
  stop(): Promise<boolean>;
  terminal(command: string): Promise<{ code: number }>;
  diagnostics(data: {
    relative: string;
    content: string;
  }): Promise<Diagnostic[]>;
  assistantChat(data: {
    modelId: string;
    messages: Message[];
    context: string;
  }): Promise<string>;
  assistantStatus(model: string): Promise<{ message: string; data: string }>;
  assistantClear(model: string): Promise<void>;
  assistantCancel(): Promise<void>;
  editorContext(path: string): Promise<void>;
  confirmClose(approved: boolean): Promise<void>;
  onOutput(cb: (text: string) => void): () => void;
  onPresence(cb: (status: Presence) => void): () => void;
  onCloseRequest(cb: () => void): () => void;
}
declare global {
  interface Window {
    chud: ChudAPI;
  }
}
