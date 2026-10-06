// Welcome to C#! Press Run (Ctrl+Enter) to compile and run this program.
// Top-level statements: the code below runs from the first line.
using System;
using System.Linq;

int[] scores = { 72, 88, 95, 64, 81 };
int total = scores.Sum();

Console.WriteLine($"Total: {total}");
Console.WriteLine($"Average: {scores.Average():F1}");
