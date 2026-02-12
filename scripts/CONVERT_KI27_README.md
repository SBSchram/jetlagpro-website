# KI-27 video conversion

## Demo (website) – use iOS-matching source

**To make the website demo match iOS**, convert the iOS-matching source to the demo folder:

- **Source:** `assets/videos/KI-27new.mov` (copy from iOS app `Resources/Videos/KI-27.mp4` or export as KI-27new.mov if needed)
- **Output:** `demo/assets/videos/KI-27.mp4`

**Run:** `.\scripts\convert_ki27new_to_demo.ps1` (PowerShell) from repo root.

The script uses the same settings as below (no sound, H.264, 480×480, crop to keep bottom). After running, the demo will use the correct KI-27 video that matches iOS.

---

## Root assets – legacy conversion

Converts `assets/videos/KI-27.MOV` to `assets/videos/KI-27.mp4` per the conversion plan:

- **No sound** (`-an`)
- **Compressed:** H.264, CRF 30, 480×480, `-movflags +faststart`
- **Crop:** Square crop keeping the **bottom** of the frame (top removed), then scale to 480×480
- **No rotations:** Source frame orientation is kept as-is

## Requirements

**ffmpeg** must be on `PATH` or in a standard install location (e.g. `C:\ffmpeg\bin`, `Program Files\ffmpeg\bin`).

- Windows: [ffmpeg.org](https://ffmpeg.org/download.html) or `winget install ffmpeg`
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
