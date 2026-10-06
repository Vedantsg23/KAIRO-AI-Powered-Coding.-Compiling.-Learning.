# Welcome to Elixir! Press Run (Ctrl+Enter) to run this script.
marks = [72, 88, 95, 64, 81]
total = Enum.sum(marks)

IO.puts("Total: #{total}")
IO.puts("Average: #{Float.round(total / length(marks), 1)}")
