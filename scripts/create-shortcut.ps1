param([string]$Destination = [Environment]::GetFolderPath('Desktop'))
$ErrorActionPreference = 'Stop'
$studioRoot = Split-Path $PSScriptRoot -Parent
$electronExe = Join-Path $studioRoot 'studio\node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath $electronExe)) { throw 'Install Studio dependencies first: npm ci --prefix studio' }
if (-not (Test-Path -LiteralPath (Join-Path $studioRoot 'studio\dist\index.html'))) { throw 'Build Studio first: npm run build --prefix studio' }
if (-not (Test-Path -LiteralPath $Destination -PathType Container)) { throw 'Shortcut destination must be an existing folder.' }
$shortcutPath = Join-Path $Destination 'CHUD Studio.lnk'
$shell = New-Object -ComObject WScript.Shell
try {
    if (Test-Path -LiteralPath $shortcutPath) {
        $existing = $shell.CreateShortcut($shortcutPath)
        if ($existing.TargetPath -ne $electronExe) { throw "A different CHUD Studio shortcut already exists at $shortcutPath. Choose another destination." }
    }
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $electronExe
    $shortcut.Arguments = '"' + (Join-Path $studioRoot 'studio') + '"'
    $shortcut.WorkingDirectory = $studioRoot
    $shortcut.WindowStyle = 1
    $shortcut.Description = 'CHUD Studio — native CHUD development environment'
    $shortcut.IconLocation = (Join-Path $studioRoot 'studio\assets\chud.ico') + ',0'
    $shortcut.Save()
    Write-Output $shortcutPath
} finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
