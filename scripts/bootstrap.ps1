param([switch]$DownloadLLVM)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 20.11 or later and npm first.' }
if ($DownloadLLVM) {
    $toolsDirectory = Join-Path $projectRoot '.tools'
    New-Item -ItemType Directory -Path $toolsDirectory -Force | Out-Null
    $installer = Join-Path $toolsDirectory 'llvm-installer.exe'
    $expectedHash = '3197846A2B19063687DD56E93E34CD941E3548D907F23A6131571321BDF9FE7B'
    if (-not (Test-Path -LiteralPath $installer)) {
        Invoke-WebRequest 'https://github.com/llvm/llvm-project/releases/download/llvmorg-20.1.8/LLVM-20.1.8-win64.exe' -OutFile $installer
    }
    if ((Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash -ne $expectedHash) { throw 'LLVM download checksum mismatch.' }
    $sevenZip = Join-Path $env:ProgramFiles '7-Zip\7z.exe'
    if (-not (Test-Path -LiteralPath $sevenZip)) { throw 'Install 7-Zip, or install LLVM yourself and set CHUD_CLANG.' }
    & $sevenZip x $installer "-o$(Join-Path $toolsDirectory 'llvm')" -y -bso0 -bsp0
    if ($LASTEXITCODE -ne 0) { throw 'LLVM extraction failed.' }
    Write-Host 'LLVM toolchain extracted locally under .tools/llvm.'
}
& (Join-Path $PSScriptRoot 'build.ps1')
