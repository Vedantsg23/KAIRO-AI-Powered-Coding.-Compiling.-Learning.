# Welcome to Perl! Press Run (Ctrl+Enter) to check and run this program.
use strict;
use warnings;

my @marks = (72, 88, 95, 64, 81);
my $total = 0;
$total += $_ for @marks;

print "Total: $total\n";
printf "Average: %.1f\n", $total / @marks;
