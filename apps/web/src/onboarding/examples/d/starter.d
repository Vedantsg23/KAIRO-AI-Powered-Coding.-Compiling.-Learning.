// Welcome to D! Press Run (Ctrl+Enter) to compile and run this program.
import std.stdio;
import std.algorithm : sum;

void main()
{
    int[] marks = [72, 88, 95, 64, 81];
    int total = marks.sum;
    writeln("Total: ", total);
    writefln("Average: %.1f", cast(double) total / marks.length);
}
