# =============================================================================
# JetLagPro — R analysis script (paper-aligned)
# =============================================================================
# Runs the core analyses described in research-paper.html:
#   - Primary linear regression (adherence + time_zones + direction)
#   - Dose–response (stimulated_points continuous)
#   - Subgroup by direction
#   - Ordinal logistic sensitivity
#   - Cohen's d (high vs minimal adherence)
#   - Benjamini–Hochberg FDR for secondary outcomes
#
# INPUT: CSV with one row per trip. Required columns:
#   - jetlag_score    : composite severity (1–5), mean of 5 symptom domains
#   - stimulated_points: number of points marked completed (0–12)
#   - time_zones      : number of time zones crossed
#   - direction       : "east" or "west"
# Optional for secondary/FDR: sleep_post, fatigue_post, concentration_post,
#   irritability_post, motivation_post, gi_post (1–5 each).
# Optional for sensitivity: device_id (for first-time-user subset).
#
# HOW TO GET THE CSV:
#   1. Download Firestore: python download_firestore.py tripCompletions trips.json
#   2. Run Python analyzer to get validated trips, then export to CSV with the
#      column names above (or add an export step to analyze_jetlag_data.py).
#   Alternatively, export from your Firebase/analytics pipeline and rename
#   columns to match (timezonesCount -> time_zones, travelDirection -> direction,
#   pointsCompleted -> stimulated_points; compute jetlag_score as mean of
#   sleepPost, fatiguePost, concentrationPost, irritabilityPost, motivationPost, giPost).
#
# USAGE:
#   Rscript scripts/analyze_jetlag_r.R [path/to/firebase_export.csv]
#   Default path if omitted: firebase_export.csv (in current directory).
#
# REQUIREMENTS: tidyverse, sandwich, lmtest, MASS, effectsize
#   install.packages(c("tidyverse","sandwich","lmtest","MASS","effectsize"))
# =============================================================================

# ---- libraries ----
library(tidyverse)
library(sandwich)
library(lmtest)
library(MASS)
library(effectsize)

# ---- arguments ----
args <- commandArgs(trailingOnly = TRUE)
csv_path <- if (length(args) >= 1) args[1] else "firebase_export.csv"

if (!file.exists(csv_path)) {
  stop("CSV not found: ", csv_path,
       "\nUsage: Rscript analyze_jetlag_r.R [path/to/export.csv]")
}

# ---- load and clean ----
df <- read_csv(csv_path, show_col_types = FALSE)

df <- df %>%
  filter(!is.na(jetlag_score)) %>%
  mutate(
    adherence_cat = cut(stimulated_points,
                        breaks = c(-Inf, 2, 5, 8, 12),
                        labels = c("0-2", "3-5", "6-8", "9-12")),
    direction = factor(tolower(trimws(direction)), levels = c("west", "east")),
    tz_band = cut(time_zones,
                  breaks = c(0, 2, 5, 8, Inf),
                  labels = c("1-2", "3-5", "6-8", "9+"),
                  right = TRUE)
  )

# Drop rows with missing key covariates (time_zones or direction)
df <- df %>% filter(!is.na(time_zones) & !is.na(direction) & !is.na(adherence_cat))
n <- nrow(df)
message("Analysis sample: n = ", n, " trips")

if (n < 30) {
  message("WARNING: Small n. Results are for monitoring only; do not report inferential statistics until pre-specified sample size (e.g. 300–400 per subgroup) is reached.")
}

# ---- primary linear regression (paper: time_zones + direction only) ----
model <- lm(jetlag_score ~ adherence_cat + time_zones + direction, data = df)
message("\n---- Primary model (robust SE) ----")
print(coeftest(model, vcov = vcovHC(model, type = "HC1")))

# ---- dose–response (continuous stimulated_points) ----
dose_model <- lm(jetlag_score ~ stimulated_points + time_zones + direction, data = df)
message("\n---- Dose–response model (robust SE) ----")
print(coeftest(dose_model, vcov = vcovHC(dose_model, type = "HC1")))

# ---- subgroup: east vs west ----
east_df <- df %>% filter(direction == "east")
west_df <- df %>% filter(direction == "west")
if (nrow(east_df) >= 10) {
  east_model <- lm(jetlag_score ~ adherence_cat + time_zones, data = east_df)
  message("\n---- Subgroup: East (robust SE) ----")
  print(coeftest(east_model, vcov = vcovHC(east_model, type = "HC1")))
}
if (nrow(west_df) >= 10) {
  west_model <- lm(jetlag_score ~ adherence_cat + time_zones, data = west_df)
  message("\n---- Subgroup: West (robust SE) ----")
  print(coeftest(west_model, vcov = vcovHC(west_model, type = "HC1")))
}

# ---- ordinal logistic sensitivity ----
df_ord <- df %>% mutate(jetlag_score_ord = factor(jetlag_score, ordered = TRUE))
ord_model <- tryCatch(
  polr(jetlag_score_ord ~ adherence_cat + time_zones + direction, data = df_ord, Hess = TRUE),
  error = function(e) { message("Ordinal model skipped (e.g. too few levels or small n): ", e$message); NULL }
)
if (!is.null(ord_model)) {
  message("\n---- Ordinal logistic (sensitivity) ----")
  print(summary(ord_model))
}

# ---- effect size: high vs minimal adherence ----
df_high_min <- df %>% filter(adherence_cat %in% c("0-2", "9-12"))
if (nrow(df_high_min) >= 10) {
  d <- cohens_d(jetlag_score ~ adherence_cat, data = df_high_min)
  message("\n---- Cohen's d (9–12 vs 0–2 points) ----")
  print(d)
}

# ---- secondary outcomes with BH FDR ----
secondary_vars <- c("sleep_post", "fatigue_post", "concentration_post",
                    "irritability_post", "motivation_post", "gi_post")
secondary_vars <- intersect(secondary_vars, names(df))
if (length(secondary_vars) > 0) {
  pvals <- setNames(rep(NA_real_, length(secondary_vars)), secondary_vars)
  for (v in secondary_vars) {
    m <- lm(as.formula(paste0(v, " ~ adherence_cat + time_zones + direction")), data = df)
    # p for adherence_cat 3-5 (first non-reference coefficient) or use joint test
    cf <- summary(m)$coefficients
    idx <- grep("adherence_cat", rownames(cf))
    if (length(idx) >= 1) pvals[v] <- min(cf[idx, "Pr(>|t|)"])
  }
  pvals <- pvals[!is.na(pvals)]
  if (length(pvals) > 0) {
    message("\n---- Secondary outcomes: raw p-values and BH-adjusted ----")
    print(data.frame(
      outcome = names(pvals),
      p_value = pvals,
      p_BH = p.adjust(pvals, method = "BH")
    ))
  }
} else {
  message("\n---- Secondary outcomes: no optional symptom columns found; skip FDR ----")
}

message("\nDone. Do not report inferential conclusions until pre-specified sample size is reached.")
