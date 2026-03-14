# =============================================================================
# JetLagPro — Phase-shift schematic (circadian misalignment + non-photic cues)
# =============================================================================
# Conceptual figure for the paper: origin circadian phase, destination
# misalignment, and timed stimulation windows as "Scheduled non-photic cues
# (acupressure)" so chronobiology reviewers see the protocol as a behavioral
# zeitgeber schedule.
#
# REQUIREMENTS: tidyverse (ggplot2)
#
# USAGE: Rscript scripts/phase_shift_figure.R
# Output: figures/phase_shift_schematic.png
# =============================================================================

library(tidyverse)

# Destination local time (0–24 h)
hour <- seq(0, 24, by = 0.1)

# Example: +6 h eastward. Origin phase lags destination clock by 6 h.
# So at destination hour 6, body is still at origin midnight.
shift_h <- 6
origin_phase    <- sin(((hour + shift_h) / 24) * 2 * pi)   # body still on origin clock
dest_phase      <- sin((hour / 24) * 2 * pi)               # target (destination-aligned)

df <- tibble(
  hour = rep(hour, 2),
  value = c(origin_phase, dest_phase),
  curve = rep(c("Origin circadian phase", "Destination (target) phase"), each = length(hour))
)

# Stimulation windows: 2 h each, meridian order LU, LI, ST, SP, HT, SI
# (example slots in destination local time; adjust to match Table 1 if needed)
windows <- tibble(
  xmin = c(2, 4, 6, 8, 10, 12),
  xmax = c(4, 6, 8, 10, 12, 14),
  meridian = c("LU", "LI", "ST", "SP", "HT", "SI")
)

fig_dir <- "figures"
if (!dir.exists(fig_dir)) dir.create(fig_dir, recursive = TRUE)

p <- ggplot(df, aes(x = hour, y = value, colour = curve, linetype = curve)) +
  geom_line(linewidth = 1) +
  scale_linetype_manual(values = c("Origin circadian phase" = "solid", "Destination (target) phase" = "dashed")) +
  scale_colour_manual(values = c("Origin circadian phase" = "black", "Destination (target) phase" = "gray40")) +
  geom_rect(
    data = windows,
    aes(xmin = xmin, xmax = xmax, ymin = -Inf, ymax = Inf),
    inherit.aes = FALSE,
    fill = "steelblue",
    alpha = 0.2
  ) +
  geom_text(
    data = windows,
    aes(x = (xmin + xmax) / 2, y = -1.15, label = meridian),
    inherit.aes = FALSE,
    size = 3,
    fontface = "bold"
  ) +
  annotate("text", x = 8, y = -1.35, label = "Scheduled non-photic cues (acupressure)", size = 3.2, fontface = "italic") +
  labs(
    x = "Local time (destination, h)",
    y = "Circadian phase (relative)",
    title = "Circadian misalignment after eastward travel (+6 h)",
    colour = NULL,
    linetype = NULL
  ) +
  scale_x_continuous(breaks = seq(0, 24, 4), limits = c(0, 24)) +
  scale_y_continuous(limits = c(-1.5, 1.2)) +
  theme_minimal(base_size = 11) +
  theme(
    legend.position = "bottom",
    plot.title = element_text(hjust = 0.5, size = 12)
  )

out_path <- file.path(fig_dir, "phase_shift_schematic.png")
ggsave(out_path, p, width = 7, height = 5, dpi = 150)
message("Saved ", out_path)

# Copy to assets/images/ for the paper webpage if that directory exists
assets_dir <- "assets/images"
if (dir.exists(assets_dir)) {
  file.copy(out_path, file.path(assets_dir, "phase_shift_schematic.png"), overwrite = TRUE)
  message("Copied to ", file.path(assets_dir, "phase_shift_schematic.png"))
}
