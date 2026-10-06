{ Welcome to Pascal! Press Run (Ctrl+Enter) to compile and run this program.
  Range checks are on: an index outside an array stops the program. }
program Scores;
const
  Marks: array[1..5] of integer = (72, 88, 95, 64, 81);
var
  i, total: integer;
begin
  total := 0;
  for i := 1 to 5 do
    total := total + Marks[i];
  writeln('Total: ', total);
  writeln('Average: ', total / 5 :0:1);
end.
