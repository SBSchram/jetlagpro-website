from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "For Submission"
OUT_PATH = ROOT / "assets" / "For Submission" / "PointsComposite_600dpi.png"

# Exact order requested from the existing table layout.
ORDER = [
    "LU-8",
    "LI-1",
    "ST-36",
    "SP-10",
    "HT-8",
    "SI-5",
    "BL-2",
    "KI-27",
    "PC-8",
    "SJ-6",
    "GB-20",
    "LIV-8",
]

CELL_W = 1200
CELL_H = 1200
LABEL_H = 190
ROWS = 2
COLS = 6
MARGIN = 24
TABLE_W = COLS * CELL_W
TABLE_H = ROWS * (CELL_H + LABEL_H)
CANVAS_W = TABLE_W + (MARGIN * 2)
CANVAS_H = TABLE_H + (MARGIN * 2)
OUTPUT_DPI = 600
LABEL_PT = 14


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        r"C:\Windows\Fonts\times.ttf",
        r"C:\Windows\Fonts\timesbd.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()


def open_standardized_image(point_name: str) -> Image.Image:
    candidates = [
        SRC_DIR / f"{point_name}b.png",
        SRC_DIR / f"{point_name}B.png",
        SRC_DIR / f"{point_name}.png",
        SRC_DIR / f"{point_name}.PNG",
    ]
    path = next((p for p in candidates if p.exists()), None)
    if path is None:
        tried = ", ".join(p.name for p in candidates)
        raise FileNotFoundError(f"Missing source image for {point_name}. Tried: {tried}")
    return Image.open(path).convert("RGB")


def main() -> None:
    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), "white")
    draw = ImageDraw.Draw(canvas)
    label_px = int(round(LABEL_PT * OUTPUT_DPI / 72))
    label_font = load_font(label_px)
    label_color = (35, 57, 88)

    image_max_w = CELL_W - 120
    image_max_h = CELL_H - 120

    for idx, point in enumerate(ORDER):
        row = idx // COLS
        col = idx % COLS
        x0 = MARGIN + (col * CELL_W)
        y0 = MARGIN + (row * (CELL_H + LABEL_H))

        img = open_standardized_image(point)
        img.thumbnail((image_max_w, image_max_h), Image.Resampling.LANCZOS)

        img_x = x0 + (CELL_W - img.width) // 2
        img_y = y0 + (CELL_H - img.height) // 2
        canvas.paste(img, (img_x, img_y))

        bbox = draw.textbbox((0, 0), point, font=label_font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        text_x = x0 + (CELL_W - text_w) // 2
        text_y = y0 + CELL_H + (LABEL_H - text_h) // 2 - 8
        draw.text((text_x, text_y), point, fill=label_color, font=label_font)

    # Draw table grid.
    grid_color = (140, 140, 140)
    for c in range(COLS + 1):
        x = MARGIN + (c * CELL_W)
        draw.line([(x, MARGIN), (x, MARGIN + TABLE_H)], fill=grid_color, width=2)
    for r in range(ROWS + 1):
        y = MARGIN + (r * (CELL_H + LABEL_H))
        draw.line([(MARGIN, y), (MARGIN + TABLE_W, y)], fill=grid_color, width=2)

    canvas.save(OUT_PATH, format="PNG", dpi=(OUTPUT_DPI, OUTPUT_DPI), optimize=False)
    print(f"Saved: {OUT_PATH}")
    print(f"Canvas: {CANVAS_W}x{CANVAS_H}px")


if __name__ == "__main__":
    main()
