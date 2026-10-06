# Welcome to Nim! Press Run (Ctrl+Enter) to compile and run this program.
let marks = [72, 88, 95, 64, 81]
var total = 0
for mark in marks:
  total += mark

echo "Total: ", total
echo "Average: ", total / marks.len
