# JetLagPro — R analysis pipeline (paper-aligned)

Run the same analyses described in the research paper as data come in. Use for **monitoring and testing**; do not report inferential conclusions until the pre-specified sample size (e.g. ≥300–400 per subgroup) is reached.

## Recommended folder structure

```
analysis/
   firebase_export.csv
   jetlag_analysis.R
   figures/
```

The script saves into `figures/` by default and creates the folder if needed. To add another plot (e.g. a custom chart), use the same pattern:

```r
ggsave("figures/jetlag_by_timezone.png", p, width = 7, height = 5)
```

## Quick start

1. **Export trip data to CSV**
   ```bash
   python scripts/download_firestore.py tripCompletions trips.json
   python scripts/export_trips_for_r.py --trips trips.json --output firebase_export.csv
   ```

2. **Run R analysis**
   ```bash
   Rscript scripts/analyze_jetlag_r.R firebase_export.csv
   ```
   If the CSV is in the current directory and named `firebase_export.csv`, you can run:
   ```bash
   Rscript scripts/analyze_jetlag_r.R
   ```

## R requirements

Install once (analysis + DAG figure):

```r
install.packages(c("tidyverse", "sandwich", "lmtest", "MASS", "effectsize", "broom", "gt", "dagitty", "ggdag"))
```

## What the R script does

- **Cleaning:** Drops rows missing composite score or key covariates; builds adherence categories (0–2, 3–5, 6–8, 9–12) and time-zone bands.
- **Primary model:** Linear regression of `jetlag_score` on adherence category + `time_zones` + `direction`, including all validated trips and using cluster-robust (HC1) standard errors by `device_id` when available.
- **Dose–response:** Same outcome with `stimulated_points` as continuous predictor.
- **Subgroups:** Same model stratified by east vs west (when n ≥ 10 per group).
- **Sensitivity:** Ordinal logistic regression for composite score (when feasible), plus a first-trip-per-device subset analysis.
- **Effect size:** Cohen’s d for high (9–12) vs minimal (0–2) adherence.
- **Secondary outcomes:** Optional symptom domains with Benjamini–Hochberg FDR at 5%.
- **Outputs:** Regression table (gt), forest plot of adherence effects, and website-style chart (mean severity by time-zone band and adherence). Plots are saved in `figures/` as `forest_plot_adherence.png` and `severity_by_tz_adherence.png` (the script creates `figures/` if it doesn’t exist).

Covariates match the paper: **time_zones** and **direction** only (no age, sex, or trip duration).

## CSV format

Required columns (from `export_trips_for_r.py` or your own export):

| Column             | Description                              |
|--------------------|------------------------------------------|
| `jetlag_score`     | Composite severity 1–5 (mean of domains) |
| `stimulated_points`| Points marked completed (0–12)          |
| `time_zones`       | Time zones crossed                       |
| `direction`        | `"east"` or `"west"`                    |
| `device_id`        | User/device identifier for clustering    |

Optional: `start_date` (trip ordering for first-trip sensitivity), `sleep_post`, `fatigue_post`, `concentration_post`, `irritability_post`, `motivation_post`, `gi_post` (1–5 each) for secondary FDR.

## DAG figure (Methods)

To generate the causal diagram cited in the paper (confounders: time zones, direction):

```bash
Rscript scripts/dag_jetlag.R
```

Output: `figures/dag_jetlag.png`. Requires `dagitty` and `ggdag`.

## Phase-shift figure (Figure 2)

To generate the circadian phase-shift schematic (origin phase, destination misalignment, scheduled non-photic cues):

```bash
Rscript scripts/phase_shift_figure.R
```

Output: `figures/phase_shift_schematic.png`. If run from the repo root and `assets/images/` exists, the script copies the file there for the paper webpage. Otherwise copy `figures/phase_shift_schematic.png` to `assets/images/` so the research paper displays Figure 2.

## Small n

If `n < 30`, the script prints a warning. Treat results as **monitoring only** until the target sample size is reached; do not report p-values or conclusions in the paper.
