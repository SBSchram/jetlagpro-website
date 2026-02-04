# KI-27.MOV → MP4 conversion

Converts `assets/videos/KI-27.MOV` to `assets/videos/KI-27.mp4` per the conversion plan:

- **No sound** (`-an`)
- **Compressed:** H.264, CRF 30, 480×480, `-movflags +faststart`
- **Crop:** Square crop keeping the **bottom** of the frame (top removed), then scale to 480×480
- **No rotations:** Source frame orientation is kept as-is

## Requirements

**ffmpeg** must be on `PATH` or in a standard install location. The PowerShell script also checks Chocolatey, Scoop, and the registry PATH (so it can find ffmpeg without reopening the terminal after install).

**If you see "ffmpeg not found":**

1. Install ffmpeg, e.g. in PowerShell (Admin optional):  
   `winget install ffmpeg`
2. Close and reopen PowerShell (or open a new terminal) so PATH is updated.
3. From the repo root, run again:  
   `.\scripts\convert_ki27_to_mp4.ps1`

Other install options:

- Windows: [ffmpeg.org](https://ffmpeg.org/download.html), or `winget install ffmpeg`, or Chocolatey/Scoop
- macOS: `brew install ffmpeg`
- WSL/Git Bash: `sudo apt install ffmpeg` or equivalent

## How to run

**From repo root.**

- **PowerShell:**  
  `.\scripts\convert_ki27_to_mp4.ps1`

- **Bash (Git Bash / WSL / macOS):**  
  `bash scripts/convert_ki27_to_mp4.sh`

## Verify output

After a successful run:

1. **File exists:** `assets/videos/KI-27.mp4`
2. **No audio:** Play the file; there should be no sound.
3. **Bottom preserved:** The bottom of the original frame is still the bottom; only the top was cropped.
4. **No rotation:** Orientation matches the original.
5. **Size:** File is smaller than the source MOV; typically on the order of hundreds of KB to low MB for a short clip at 480×480.
