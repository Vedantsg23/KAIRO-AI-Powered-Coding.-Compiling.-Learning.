# Welcome to Ruby! Press Run (Ctrl+Enter) to check and run this program.

scores = [72, 88, 95, 64, 81]
total = scores.sum

puts "Total: #{total}"
puts "Average: #{(total.to_f / scores.size).round(1)}"
