check_age <- function(age) {
  if (age < 0) stop("age cannot be negative")
  age
}
print(check_age(-5))
