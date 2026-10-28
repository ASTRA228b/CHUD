param([switch]$SkipStudio)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$cmakeCommand = Get-Command cmake -ErrorAction SilentlyContinue
if ($cmakeCommand) { $cmakePath = $cmakeCommand.Source } else {
    $vswherePath = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
    if (-not (Test-Path -LiteralPath $vswherePath)) { throw 'Install Visual Studio 2022 with Desktop development with C++, CMake, and a Windows SDK.' }
    $vsPath = & $vswherePath -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    $cmakePath = Join-Path $vsPath 'Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe'
}
if (-not (Test-Path -LiteralPath $cmakePath)) { throw 'CMake was not found.' }
$localClang = Join-Path $projectRoot '.tools\llvm\bin\clang.exe'
if (-not $env:CHUD_CLANG -and -not (Test-Path -LiteralPath $localClang) -and -not (Get-Command clang -ErrorAction SilentlyContinue)) {
    throw 'LLVM is required. Run scripts\bootstrap.ps1 -DownloadLLVM, or set CHUD_CLANG to clang.exe.'
}
Push-Location $projectRoot
try {
    & $cmakePath -S . -B build -G 'Visual Studio 17 2022' -A x64
    if ($LASTEXITCODE -ne 0) { throw 'CHUD configuration failed.' }
    & $cmakePath --build build --config Release
    if ($LASTEXITCODE -ne 0) { throw 'CHUD compilation failed.' }
    & npm.cmd ci --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'CHUD tooling dependencies failed to install.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'CHUD compiler or tooling tests failed.' }
    if (-not $SkipStudio) {
        Push-Location studio
        try {
            & npm.cmd ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'Studio dependencies failed to install.' }
            & npm.cmd run build
            if ($LASTEXITCODE -ne 0) { throw 'Studio build failed.' }
            & npm.cmd test
            if ($LASTEXITCODE -ne 0) { throw 'Studio tests failed.' }
            & node tests-ui/smoke.mjs
            if ($LASTEXITCODE -ne 0) { throw 'Studio UI test failed.' }
        } finally { Pop-Location }
    }
    Write-Host 'CHUD build and validation succeeded.'
} finally { Pop-Location }
