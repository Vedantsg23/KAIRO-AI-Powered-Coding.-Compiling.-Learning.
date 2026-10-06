<?php
echo "What is your name?\n";
$name = trim((string) fgets(STDIN));
if ($name === "") {
    echo "No name given (type one in the Input tab).\n";
} else {
    echo "Hello, $name!\n";
}
