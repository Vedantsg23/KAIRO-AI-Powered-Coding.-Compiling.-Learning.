import std.stdio;
import std.string : strip;

void main()
{
    string name = readln().strip();
    writeln("Hello, ", name, "!");
}
