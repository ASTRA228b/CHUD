const quote = (value) =>
  JSON.stringify(
    Array.from(String(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ""))
      .filter(
        (c) =>
          !(
            c.length === 1 &&
            c.charCodeAt(0) >= 0xd800 &&
            c.charCodeAt(0) <= 0xdfff
          ),
      )
      .slice(0, 120)
      .join(""),
  );
const program = (imports, body) =>
  `chud CHUD.App;\nuse CHUD.Core;\n${imports.map((name) => `use CHUD.${name};\n`).join("")}\npublic func Main() -> int {\n${body
    .trim()
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n")}\n    return 0;\n}\n`;

export const starters = [
  {
    id: "hello",
    name: "Hello world",
    category: "Console",
    description: "Print a greeting. A clean first program.",
    libraries: ["Core"],
  },
  {
    id: "calculator",
    name: "Calculator",
    category: "Console",
    description: "Add, subtract, multiply and divide two integers.",
    libraries: ["Core", "Math"],
  },
  {
    id: "text",
    name: "Text workshop",
    category: "Text",
    description: "Trim, change case, replace text and count characters.",
    libraries: ["Text"],
  },
  {
    id: "list",
    name: "Scoreboard",
    category: "Collections",
    description: "Collect scores, sort them and print the total.",
    libraries: ["Collections", "Convert"],
  },
  {
    id: "dice",
    name: "Dice roller",
    category: "Random",
    description: "Roll six dice using an exclusive upper bound.",
    libraries: ["Random", "Convert"],
  },
  {
    id: "file",
    name: "Text file notebook",
    category: "Files",
    description:
      "Write, append and read chud-notebook.txt in the project folder.",
    libraries: ["IO", "Path"],
  },
  {
    id: "counter",
    name: "GUI counter",
    category: "GUI",
    description: "A native window with a click counter and reset button.",
    libraries: ["GUI", "GUILayout"],
  },
  {
    id: "dashboard",
    name: "GUI dashboard",
    category: "GUI",
    description: "Buttons, a toggle and a keyboard-accessible integer slider.",
    libraries: ["GUI", "GUILayout"],
  },
  {
    id: "forge",
    name: "Game health demo",
    category: "CHUD originals",
    description: "Move a health value toward a target and draw a console bar.",
    libraries: ["Forge", "Spark", "Convert"],
  },
  {
    id: "timer",
    name: "Stopwatch",
    category: "Time",
    description: "Measure a short operation using a monotonic clock.",
    libraries: ["Time", "Convert"],
  },
];

export function starterSource(id, title = "Hello from CHUD!") {
  const value = quote(title);
  switch (id) {
    case "hello":
      return program([], `CHUD.Print(${value});`);
    case "calculator":
      return program(
        ["Math"],
        `let a = 24;\nlet b = 6;\nCHUD.Print(${value});\nCHUD.Print(a + b);\nCHUD.Print(a - b);\nCHUD.Print(a * b);\nCHUD.Print(a / b);\nCHUD.Print(CHUD.Math.Max(a, b));`,
      );
    case "text":
      return program(
        ["Text"],
        `let text = CHUD.Text.Trim(${value});\nCHUD.Print(CHUD.Text.Upper(text));\nCHUD.Print(CHUD.Text.Lower(text));\nCHUD.Print(CHUD.Text.Length(text));\nCHUD.Print(CHUD.Text.Replace(text, "CHUD", "Studio"));`,
      );
    case "list":
      return program(
        ["Collections", "Convert"],
        `CHUD.Print(${value});\nlet scores: list = CHUD.Collections.New();\nCHUD.Collections.Add(scores, 45);\nCHUD.Collections.Add(scores, 12);\nCHUD.Collections.Add(scores, 90);\nCHUD.Collections.Sort(scores);\nfor i in 0..CHUD.Collections.Count(scores) {\n    CHUD.Print(CHUD.Collections.Get(scores, i));\n}\nCHUD.Print(CHUD.Convert.ToString(CHUD.Collections.Sum(scores)));`,
      );
    case "dice":
      return program(
        ["Random", "Convert"],
        `CHUD.Print(${value});\n// Range includes 1 and excludes 7.\nfor roll in 0..6 {\n    CHUD.Print(CHUD.Random.Range(1, 7));\n}`,
      );
    case "file":
      return program(
        ["IO", "Path"],
        `// This template writes a file when you run it.\nlet file = CHUD.Path.Combine(".", "chud-notebook.txt");\nCHUD.IO.WriteText(file, ${value});\nCHUD.IO.AppendText(file, "\\nWritten by CHUD.\\n");\nCHUD.Print(CHUD.IO.ReadText(file));`,
      );
    case "counter":
      return program(
        ["GUI", "GUILayout"],
        `mut clicks = 0;\nCHUD.GUI.Open(${value}, 520, 320);\nwhile CHUD.GUI.BeginFrame() {\n    CHUD.GUILayout.Label("My first CHUD window");\n    CHUD.GUILayout.Value("Clicks", clicks);\n    if CHUD.GUILayout.Button("Add one") { clicks += 1; }\n    if CHUD.GUILayout.Button("Reset") { clicks = 0; }\n    if CHUD.GUILayout.Button("Close") { CHUD.GUI.Close(); }\n    CHUD.GUI.EndFrame();\n}`,
      );
    case "dashboard":
      return program(
        ["GUI", "GUILayout"],
        `mut enabled = true;\nmut volume = 50;\nCHUD.GUI.Open(${value}, 560, 400);\nwhile CHUD.GUI.BeginFrame() {\n    CHUD.GUILayout.Label("CHUD immediate-mode dashboard");\n    enabled = CHUD.GUILayout.Toggle("Enable sound", enabled);\n    volume = CHUD.GUILayout.Slider("Volume", volume, 0, 100);\n    if enabled { CHUD.GUILayout.Label("Sound is enabled"); }\n    CHUD.GUILayout.Space(12);\n    if CHUD.GUILayout.Button("Close") { CHUD.GUI.Close(); }\n    CHUD.GUI.EndFrame();\n}`,
      );
    case "forge":
      return program(
        ["Forge", "Spark", "Convert"],
        `CHUD.Print(CHUD.Spark.Badge(${value}));\nmut health = 10;\nfor tick in 0..5 {\n    health = CHUD.Forge.StepToward(health, 100, 18);\n    CHUD.Print(CHUD.Spark.Bar(health, 100, 20));\n}\nCHUD.Print(CHUD.Forge.Wrap(-1, 0, 8));\nCHUD.Print(CHUD.Forge.Lerp(0, 100, 25));`,
      );
    case "timer":
      return program(
        ["Time", "Convert"],
        `CHUD.Print(${value});\nlet start = CHUD.Time.Millis();\nCHUD.Time.Sleep(25);\nCHUD.Print(CHUD.Time.Millis() - start);`,
      );
    default:
      throw new Error(`Unknown starter template: ${id}`);
  }
}
