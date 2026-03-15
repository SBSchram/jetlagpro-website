"""
JetLagPro — Phase-shift schematic (circadian misalignment + non-photic cues).
Generates the same figure as phase_shift_figure.R for the paper (Figure 2).
Output: figures/phase_shift_schematic.png (and copy to assets/images/ if present).
"""
import math
import os

try:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
except ImportError:
    print("Install matplotlib and numpy: pip install matplotlib numpy")
    raise

# Destination local time (0–24 h)
hour = np.arange(0, 24.01, 0.1)
shift_h = 6  # eastward +6 h example
origin_phase = np.sin(((hour + shift_h) / 24) * 2 * math.pi)
dest_phase = np.sin((hour / 24) * 2 * math.pi)

fig, ax = plt.subplots(figsize=(7, 5))
ax.plot(hour, origin_phase, "k-", linewidth=1.5, label="Origin circadian phase")
ax.plot(hour, dest_phase, color="gray", linestyle="--", linewidth=1.5, label="Destination (target) phase")

# Stimulation windows: 2 h each, LU, LI, ST, SP, HT, SI
windows = [(2, 4), (4, 6), (6, 8), (8, 10), (10, 12), (12, 14)]
labels = ["LU", "LI", "ST", "SP", "HT", "SI"]
for (xmin, xmax), lab in zip(windows, labels):
    ax.axvspan(xmin, xmax, alpha=0.2, color="steelblue")
    ax.text((xmin + xmax) / 2, -1.15, lab, ha="center", fontsize=10, fontweight="bold")
ax.text(8, -1.35, "Scheduled non-photic cues (acupressure)", ha="center", fontsize=10, style="italic")

ax.set_xlabel("Local time (destination, h)")
ax.set_ylabel("Circadian phase (relative)")
ax.set_title("Circadian misalignment after eastward travel (+6 h)")
ax.set_xticks(range(0, 25, 4))
ax.set_ylim(-1.5, 1.2)
ax.legend(loc="lower right")
ax.grid(True, alpha=0.3)

fig_dir = "figures"
os.makedirs(fig_dir, exist_ok=True)
out_path = os.path.join(fig_dir, "phase_shift_schematic.png")
fig.savefig(out_path, dpi=150, bbox_inches="tight")
plt.close()
print("Saved", out_path)

assets_dir = "assets/images"
if os.path.isdir(assets_dir):
    import shutil
    dest = os.path.join(assets_dir, "phase_shift_schematic.png")
    shutil.copy2(out_path, dest)
    print("Copied to", dest)
