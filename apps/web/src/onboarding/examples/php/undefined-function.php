<?php
function average(array $values): float {
    return array_sum($values) / count($values);
}

echo avrage([72, 88, 95]) . "\n";
