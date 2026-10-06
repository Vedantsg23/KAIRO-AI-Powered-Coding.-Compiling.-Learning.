<?php
$divisor = (int) trim((string) fgets(STDIN));   // try 4, then 0
echo "100 / $divisor = " . intdiv(100, $divisor) . "\n";
