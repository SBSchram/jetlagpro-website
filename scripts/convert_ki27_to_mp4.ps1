# Convert KI-27.MOV to KI-27.mp4 per plan:
# - No sound (-an)
# - Compressed: H.264, CRF 30, 480x480, faststart
# - Crop from top so bottom is preserved: square crop keeping bottom, then scale to 480x480
# - No rotations (source frame as-is)
# Requires: ffmpeg on PATH or in a common install location.

$ErrorActionPreference = "Stop"
# Repo root = parent of the folder containing this script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
$root = [System.IO.Path]::GetFullPath((Join-Path $scriptDir ".."))
$src = Join-Path $root "assets\videos\KI-27.MOV"
$dst = Join-Path $root "assets\videos\KI-27.mp4"

if (-not (Test-Path $src)) {
    Write-Error "Source not found: $src (root=$root)"
}

# Prefer ffmpeg on PATH; else check common install locations
$ffmpegExe = $null
try { $ffmpegExe = (Get-Command ffmpeg -ErrorAction Stop).Source } catch {}
if (-not $ffmpegExe) {
    # Use up-to-date PATH (Machine + User); use .NET Split to avoid \U etc. being parsed as escapes
    $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine"); if (-not $machine) { $machine = "" }
    $user = [System.Environment]::GetEnvironmentVariable("Path", "User"); if (-not $user) { $user = "" }
    $pathDirs = @($machine.Split(';', [StringSplitOptions]::RemoveEmptyEntries) +
                     $user.Split(';', [StringSplitOptions]::RemoveEmptyEntries))
    foreach ($dir in $pathDirs) {
        $d = $dir.Trim()
        if (-not $d) { continue }
        $candidate = Join-Path $d "ffmpeg.exe"
        if (Test-Path -LiteralPath $candidate) { $ffmpegExe = $candidate; break }
    }
}
if (-not $ffmpegExe) {
    $searchPaths = @(
        "$env:ProgramFiles\ffmpeg\bin\ffmpeg.exe",
        "${env:ProgramFiles(x86)}\ffmpeg\bin\ffmpeg.exe",
        "C:\ffmpeg\bin\ffmpeg.exe",
        "$env:LOCALAPPDATA\Programs\ffmpeg\bin\ffmpeg.exe",
        "$env:ProgramData\chocolatey\bin\ffmpeg.exe",
        "$env:USERPROFILE\scoop\shims\ffmpeg.exe",
        "$env:USERPROFILE\scoop\apps\ffmpeg\current\ffmpeg.exe"
    )
    foreach ($p in $searchPaths) {
        if ($p -and (Test-Path $p)) { $ffmpegExe = $p; break }
    }
}
if (-not $ffmpegExe) {
    Write-Error "ffmpeg not found. Install it (e.g. winget install ffmpeg), then close and reopen PowerShell and run this script again. See scripts\CONVERT_KI27_README.md."
}

# Crop to square keeping bottom: crop=min(iw\,ih):min(iw\,ih):0:ih-min(iw\,ih)
# Commas inside min() must be escaped (\) or ffmpeg treats them as filter separators.
# Then scale to 480x480
& $ffmpegExe -i $src `
    -vf "crop=min(iw\,ih):min(iw\,ih):0:ih-min(iw\,ih),scale=480:480" `
    -c:v libx264 -preset medium -crf 30 `
    -an `
    -movflags +faststart `
    -y $dst

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Output: $dst"
(Get-Item $dst).Length / 1KB | ForEach-Object { Write-Host ("Size: {0:N1} KB" -f $_) }
