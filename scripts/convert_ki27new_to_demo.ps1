# Convert KI-27new.mov (iOS-matching source) to demo/assets/videos/KI-27.mp4
# Same settings as convert_ki27_to_mp4.ps1: no sound, H.264, 480x480, crop bottom.
# Run from repo root. Requires ffmpeg on PATH or common install location.

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $scriptDir) { $scriptDir = $PSScriptRoot }
$root = [System.IO.Path]::GetFullPath((Join-Path $scriptDir ".."))
$src = Join-Path $root "assets\videos\KI-27new.mov"
$dst = Join-Path $root "demo\assets\videos\KI-27.mp4"

if (-not (Test-Path $src)) {
    Write-Error "Source not found: $src (expected iOS-matching KI-27 video). Copy KI-27 from iOS app Resources/Videos to assets/videos as KI-27new.mov and run again."
}

$ffmpegExe = $null
try { $ffmpegExe = (Get-Command ffmpeg -ErrorAction Stop).Source } catch {}
if (-not $ffmpegExe) {
    $machine = [System.Environment]::GetEnvironmentVariable("Path", "Machine"); if (-not $machine) { $machine = "" }
    $user = [System.Environment]::GetEnvironmentVariable("Path", "User"); if (-not $user) { $user = "" }
    $pathDirs = @($machine.Split(';', [StringSplitOptions]::RemoveEmptyEntries) + $user.Split(';', [StringSplitOptions]::RemoveEmptyEntries))
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
        "$env:LOCALAPPDATA\Programs\ffmpeg\bin\ffmpeg.exe"
    )
    foreach ($p in $searchPaths) {
        if ($p -and (Test-Path $p)) { $ffmpegExe = $p; break }
    }
}
if (-not $ffmpegExe) {
    Write-Error "ffmpeg not found. Install it (e.g. winget install ffmpeg), then run this script again."
}

$dstDir = Split-Path -Parent $dst
if (-not (Test-Path $dstDir)) {
    New-Item -ItemType Directory -Path $dstDir -Force | Out-Null
}

& $ffmpegExe -i $src `
    -vf "crop=min(iw\,ih):min(iw\,ih):0:ih-min(iw\,ih),scale=480:480" `
    -c:v libx264 -preset medium -crf 30 `
    -an `
    -movflags +faststart `
    -y $dst

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Output: $dst"
(Get-Item $dst).Length / 1KB | ForEach-Object { Write-Host ("Size: {0:N1} KB" -f $_) }
