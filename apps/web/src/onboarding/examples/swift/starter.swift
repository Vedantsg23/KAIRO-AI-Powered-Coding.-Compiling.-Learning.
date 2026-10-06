// Welcome to Swift! Press Run (Ctrl+Enter) to compile and run this program.

let scores = [72, 88, 95, 64, 81]
let total = scores.reduce(0, +)

print("Total: \(total)")
print("Average: \(Double(total) / Double(scores.count))")
