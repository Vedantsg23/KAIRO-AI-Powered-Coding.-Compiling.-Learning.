# Welcome to Tcl! Press Run (Ctrl+Enter) to run this script.
set marks {72 88 95 64 81}
set total 0
foreach mark $marks {
    incr total $mark
}
puts "Total: $total"
puts "Average: [format %.1f [expr {double($total) / [llength $marks]}]]"
