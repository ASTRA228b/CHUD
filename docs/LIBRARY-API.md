# CHUD library API signatures

Generated from `runtime/builtins.def`. Parameter positions and types are shown below; semantics and argument names are documented in [Libraries](LIBRARIES.md) and [GUI](GUI.md).

## CHUD.Math

| Function          | Signature                |
| ----------------- | ------------------------ |
| `CHUD.Math.Abs`   | `(int) -> int`           |
| `CHUD.Math.Min`   | `(int, int) -> int`      |
| `CHUD.Math.Max`   | `(int, int) -> int`      |
| `CHUD.Math.Clamp` | `(int, int, int) -> int` |
| `CHUD.Math.Pow`   | `(int, int) -> int`      |
| `CHUD.Math.Gcd`   | `(int, int) -> int`      |

## CHUD.Text

| Function               | Signature                            |
| ---------------------- | ------------------------------------ |
| `CHUD.Text.Length`     | `(string) -> int`                    |
| `CHUD.Text.Concat`     | `(string, string) -> string`         |
| `CHUD.Text.Contains`   | `(string, string) -> bool`           |
| `CHUD.Text.StartsWith` | `(string, string) -> bool`           |
| `CHUD.Text.EndsWith`   | `(string, string) -> bool`           |
| `CHUD.Text.Upper`      | `(string) -> string`                 |
| `CHUD.Text.Lower`      | `(string) -> string`                 |
| `CHUD.Text.Trim`       | `(string) -> string`                 |
| `CHUD.Text.Slice`      | `(string, int, int) -> string`       |
| `CHUD.Text.Replace`    | `(string, string, string) -> string` |
| `CHUD.Text.Repeat`     | `(string, int) -> string`            |

## CHUD.Convert

| Function                | Signature          |
| ----------------------- | ------------------ |
| `CHUD.Convert.ToString` | `(int) -> string`  |
| `CHUD.Convert.ToInt`    | `(string) -> int`  |
| `CHUD.Convert.IsInt`    | `(string) -> bool` |

## CHUD.IO

| Function             | Signature                  |
| -------------------- | -------------------------- |
| `CHUD.IO.ReadLine`   | `() -> string`             |
| `CHUD.IO.ReadText`   | `(string) -> string`       |
| `CHUD.IO.WriteText`  | `(string, string) -> void` |
| `CHUD.IO.AppendText` | `(string, string) -> void` |
| `CHUD.IO.Exists`     | `(string) -> bool`         |

## CHUD.Path

| Function                  | Signature                    |
| ------------------------- | ---------------------------- |
| `CHUD.Path.Combine`       | `(string, string) -> string` |
| `CHUD.Path.FileName`      | `(string) -> string`         |
| `CHUD.Path.Extension`     | `(string) -> string`         |
| `CHUD.Path.DirectoryName` | `(string) -> string`         |

## CHUD.Random

| Function            | Signature           |
| ------------------- | ------------------- |
| `CHUD.Random.Seed`  | `(int) -> void`     |
| `CHUD.Random.Range` | `(int, int) -> int` |

## CHUD.Time

| Function           | Signature       |
| ------------------ | --------------- |
| `CHUD.Time.Now`    | `() -> int`     |
| `CHUD.Time.Millis` | `() -> int`     |
| `CHUD.Time.Sleep`  | `(int) -> void` |

## CHUD.Collections

| Function                    | Signature                  |
| --------------------------- | -------------------------- |
| `CHUD.Collections.New`      | `() -> list`               |
| `CHUD.Collections.Add`      | `(list, int) -> void`      |
| `CHUD.Collections.Get`      | `(list, int) -> int`       |
| `CHUD.Collections.Set`      | `(list, int, int) -> void` |
| `CHUD.Collections.Count`    | `(list) -> int`            |
| `CHUD.Collections.RemoveAt` | `(list, int) -> void`      |
| `CHUD.Collections.Clear`    | `(list) -> void`           |
| `CHUD.Collections.Contains` | `(list, int) -> bool`      |
| `CHUD.Collections.Sort`     | `(list) -> void`           |
| `CHUD.Collections.Sum`      | `(list) -> int`            |

## CHUD.Forge

| Function                | Signature                |
| ----------------------- | ------------------------ |
| `CHUD.Forge.Wrap`       | `(int, int, int) -> int` |
| `CHUD.Forge.StepToward` | `(int, int, int) -> int` |
| `CHUD.Forge.Lerp`       | `(int, int, int) -> int` |

## CHUD.Spark

| Function           | Signature                   |
| ------------------ | --------------------------- |
| `CHUD.Spark.Bar`   | `(int, int, int) -> string` |
| `CHUD.Spark.Badge` | `(string) -> string`        |

## CHUD.GUI

| Function              | Signature                              |
| --------------------- | -------------------------------------- |
| `CHUD.GUI.Open`       | `(string, int, int) -> void`           |
| `CHUD.GUI.BeginFrame` | `() -> bool`                           |
| `CHUD.GUI.EndFrame`   | `() -> void`                           |
| `CHUD.GUI.Close`      | `() -> void`                           |
| `CHUD.GUI.Label`      | `(int, int, int, int, string) -> void` |
| `CHUD.GUI.Button`     | `(int, int, int, int, string) -> bool` |
| `CHUD.GUI.Box`        | `(int, int, int, int, string) -> void` |

## CHUD.GUILayout

| Function                | Signature                        |
| ----------------------- | -------------------------------- |
| `CHUD.GUILayout.Label`  | `(string) -> void`               |
| `CHUD.GUILayout.Value`  | `(string, int) -> void`          |
| `CHUD.GUILayout.Button` | `(string) -> bool`               |
| `CHUD.GUILayout.Toggle` | `(string, bool) -> bool`         |
| `CHUD.GUILayout.Slider` | `(string, int, int, int) -> int` |
| `CHUD.GUILayout.Space`  | `(int) -> void`                  |
