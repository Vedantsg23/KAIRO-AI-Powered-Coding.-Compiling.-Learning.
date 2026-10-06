<?php
// Welcome to PHP! Press Run (Ctrl+Enter) to check and run this program.

$scores = [72, 88, 95, 64, 81];
$total = array_sum($scores);

echo "Total: $total\n";
printf("Average: %.1f\n", $total / count($scores));
