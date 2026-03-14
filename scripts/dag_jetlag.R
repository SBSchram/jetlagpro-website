# =============================================================================
# JetLagPro — DAG for covariate selection (paper-aligned)
# =============================================================================
# Generates the causal diagram cited in the Methods (Anticipated Data Analysis).
# Confounders we adjust for: time zones crossed, travel direction.
# Mediator we do not adjust for: sleep (on path adherence -> jetlag).
#
# REQUIREMENTS: dagitty, ggdag
#   install.packages(c("dagitty", "ggdag"))
#
# USAGE: Rscript scripts/dag_jetlag.R
# Output: figures/dag_jetlag.png
# =============================================================================

library(dagitty)
library(ggdag)

# Paper-aligned DAG: timezones and direction are confounders; sleep is mediator
dag <- dagitty("
dag {
  timezones -> adherence
  timezones -> jetlag
  direction -> adherence
  direction -> jetlag
  adherence -> jetlag
  adherence -> sleep
  sleep -> jetlag
}
")

fig_dir <- "figures"
if (!dir.exists(fig_dir)) dir.create(fig_dir, recursive = TRUE)

p <- ggdag(dag, text = TRUE) +
  theme_dag()

out_path <- file.path(fig_dir, "dag_jetlag.png")
ggsave(out_path, p, width = 7, height = 5, dpi = 150)
message("Saved ", out_path)
