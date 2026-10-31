# CHUD immediate-mode GUI

This is an original native Windows GUI library inspired by the redraw-and-handle-events pattern of [Unity IMGUI](https://docs.unity3d.com/Manual/GUIScriptingGuide.html). It is not Unity's library and does not implement Unity APIs, GameObjects, scenes, or the Unity editor. Win32/GDI supplies the window, input and rendering. No .NET, browser, or Unity installation is required by the compiled program.

```rust
use CHUD.GUI;
use CHUD.GUILayout;

public func Main() -> int {
    mut clicks = 0;
    mut enabled = true;
    mut volume = 50;
    CHUD.GUI.Open("CHUD dashboard", 560, 440);
    while CHUD.GUI.BeginFrame() {
        CHUD.GUILayout.Label("My CHUD application");
        CHUD.GUILayout.Value("Clicks", clicks);
        if CHUD.GUILayout.Button("Add one") { clicks += 1; }
        enabled = CHUD.GUILayout.Toggle("Enable sound", enabled);
        volume = CHUD.GUILayout.Slider("Volume", volume, 0, 100);
        if CHUD.GUILayout.Button("Close") { CHUD.GUI.Close(); }
        CHUD.GUI.EndFrame();
    }
    return 0;
}
```

Keep state in your CHUD variables. A Button returns true for one activation frame. Toggle returns the next bool; Slider returns the next int, so assign the results back. Every successful BeginFrame must be paired with EndFrame, including a frame that requests Close. Do not continue/break/return from that frame before EndFrame. Close requests closing; the next BeginFrame returns false. Closing the title-bar window or pressing Escape also finishes the loop.

## Window and drawing calls

- `GUI.Open(title, width, height)`: one window at a time, with client size 240..3840 × 160..2160. The window is resizable. Call Open again only after the previous window has closed.
- `GUI.BeginFrame() -> bool`: process the window's input/messages, clear the backing canvas, reset automatic layout, and report whether to draw. A minimized window waits for messages without busy-spinning. Uses a [Win32 message pump](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-peekmessagew).
- `GUI.EndFrame()`: present the double-buffered canvas and sleep 16 ms to limit redraw frequency. This is a simple tools UI, not a game renderer or a precise frame clock.
- `GUI.Close()`: request close; the runtime releases GUI resources on shutdown.
- `GUI.Label(x, y, width, height, text)`: draw one line of UTF-8 text, clipped with ellipsis.
- `GUI.Button(x, y, width, height, text) -> bool`: render a button and report a mouse click or focused keyboard activation.
- `GUI.Box(x, y, width, height, text)`: render a bordered panel with a label.

Rectangles use client coordinates in logical pixels as exposed by the process's Windows DPI mode. Width/height must be positive and no more than 32768; x/y must fit -32768..32768. Off-window drawing is clipped. Controls require an active frame.

## Automatic layout

`GUILayout` places controls vertically with 18-pixel outer margins and widths that follow the client area:

| Function                                        | Behavior                                                                     |
| ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `Label(text)`                                   | One line of static/dynamic text                                              |
| `Value(label, int)`                             | Label plus a number, with no CHUD string allocation per frame                |
| `Button(text) -> bool`                          | Full-width button                                                            |
| `Toggle(text, bool) -> bool`                    | Labeled checkbox-style control                                               |
| `Slider(label, value, minimum, maximum) -> int` | Integer slider with an inclusive range; minimum must be smaller than maximum |
| `Space(pixels)`                                 | Add 0..4096 pixels of spacing                                                |

Mouse press and release must occur in a button to activate it. Sliders follow dragging from their initial press area. Tab/Shift+Tab move focus among controls in draw order; Space/Enter activate buttons/toggles; arrow keys move a focused slider one integer step. Keep interactive calls in stable order while the user is operating them. If a changing branch hides/reorders controls, focus follows the current frame's ordinal IDs.

This first version supports a single window with a vertical layout or manual rectangles. It does not yet have editable text fields, scroll views, multiple windows, docking, Unity event types/skins, automatic DPI scaling, or a screen-reader control tree for the custom-drawn controls. Long layouts clip at the window edge; keep the content within the client height or resize the window.

Open `examples/ImmediateGUI` in Studio and Run to try the controls. Stop in Studio terminates the native process tree if needed.
