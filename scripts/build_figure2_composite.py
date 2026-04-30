from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "For Submission"
OUT_PATH = SRC_DIR / "Figure 2 Composite.png"

FILES = ["Figure 2A.png", "Figure 2B.png", "Figure 2C.png"]

# Word table measurements scaled to source image resolution.
# Images displayed at 177px in Word; actual width is 1170px => scale ~6.61
# 60 dxa = 3pt left/right padding; 30 dxa = 1.5pt top/bottom padding
# Border sz=6 = 0.75pt, color #333333
LINE_COLOR = (51, 51, 51)  # #333333


def main() -> None:
    if not SRC_DIR.exists():
        raise FileNotFoundError(f"Required source directory not found: {SRC_DIR}")

    imgs = [Image.open(SRC_DIR / f).convert("RGB") for f in FILES]
    img_w, img_h = imgs[0].size

    scale = img_w / 177.0
    pad_lr = round(3   * (96 / 72) * scale)
    pad_tb = round(1.5 * (96 / 72) * scale)
    lw     = round(0.75 * (96 / 72) * scale)

    cell_w   = pad_lr + img_w + pad_lr
    canvas_w = lw + (cell_w + lw) * 3
    canvas_h = lw + pad_tb + img_h + pad_tb + lw

    canvas = Image.new("RGB", (canvas_w, canvas_h), "white")
    draw = ImageDraw.Draw(canvas)

    for i, img in enumerate(imgs):
        x = lw + i * (cell_w + lw) + pad_lr
        y = lw + pad_tb
        canvas.paste(img, (x, y))

    # Vertical grid lines
    for i in range(4):
        x = i * (cell_w + lw)
        draw.rectangle([x, 0, x + lw - 1, canvas_h - 1], fill=LINE_COLOR)

    # Horizontal grid lines (top + bottom)
    draw.rectangle([0, 0, canvas_w - 1, lw - 1], fill=LINE_COLOR)
    draw.rectangle([0, canvas_h - lw, canvas_w - 1, canvas_h - 1], fill=LINE_COLOR)

    canvas.save(OUT_PATH, format="PNG")
    print(f"Source:  {SRC_DIR}")
    print(f"Saved:   {OUT_PATH}")
    print(f"Size:    {canvas.size}")
    print(f"pad_lr:  {pad_lr}px  pad_tb: {pad_tb}px  line_w: {lw}px")


if __name__ == "__main__":
    main()
