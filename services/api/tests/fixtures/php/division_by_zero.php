<?php
function average(array $marks): float {
    return array_sum($marks) / count($marks);
}
echo "Average:\n";
echo average([]) . "\n";
