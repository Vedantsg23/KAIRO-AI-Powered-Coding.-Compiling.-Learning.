con <- file("stdin")
name <- readLines(con, n = 1)
close(con)
cat("Hello, ", name, "!\n", sep = "")
