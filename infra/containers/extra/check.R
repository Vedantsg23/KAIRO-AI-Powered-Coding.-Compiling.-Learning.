# KAIRO's R syntax check: parse the program without running it.
# Usage (fixed argv in the R language profile): Rscript --vanilla check.R main.R
# A syntax error stops with "Error in parse(...) : main.R:LINE:COL: message".
args <- commandArgs(trailingOnly = TRUE)
invisible(parse(file = args[1]))
