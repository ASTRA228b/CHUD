# CHUD Studio 0.1.0-alpha

CHUD Studio includes an editor, a native CHUD compiler, the runtime sources, an offline Basic assistant, and an optional ChudGPT assistant and Discord Rich Presence. On first launch, Studio creates a writable HelloCHUD project in its application data folder.

| Platform | Installer | Tools needed to build and run CHUD programs |
| --- | --- | --- |
| Windows 10/11 x64 | Windows x64 Setup EXE | LLVM 20 or later with `clang` on PATH and Visual Studio 2022 Build Tools with Desktop development with C++ and a Windows SDK |
| macOS 13 or later, Apple silicon or Intel | DMG matching your processor | Xcode Command Line Tools, installed with `xcode-select --install` |
| Ubuntu 24.04 or Debian 13 x64 | Linux x64 DEB | Install `clang` and `build-essential` using your package manager |

Run Setup on Windows. On macOS, open the DMG and drag CHUD Studio to Applications. On Linux, run `sudo apt install ./CHUD-Studio-0.1.0-alpha-Linux-amd64.deb` from the download folder. The Windows installer is unsigned. The macOS apps use ad hoc signing.

Open Studio and select **Run** to build HelloCHUD. Editing and syntax diagnostics use the bundled compiler. Build and Run also use your system toolchain. Set `CHUD_CLANG` before launching Studio to choose a specific Clang executable.

Console projects build on all three operating systems. `CHUD.GUI` and `CHUD.GUILayout` use Win32 and build on Windows. New projects use `target = "native"`. For an older console project with `target = "windows-x64"`, change it to `"native"` to build on Linux or macOS.

Release assets include SHA-256 checksums. [CHUD documentation](https://chudgpt-landing.vercel.app/chud-program/docs)
