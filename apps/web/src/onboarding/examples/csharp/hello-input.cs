using System;

Console.WriteLine("What is your name?");
string? name = Console.ReadLine();
if (string.IsNullOrWhiteSpace(name))
{
    Console.WriteLine("No name given (type one in the Input tab).");
}
else
{
    Console.WriteLine($"Hello, {name.Trim()}!");
}
